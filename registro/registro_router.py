"""
Rotas da API para registros RAAS.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from registro.registro_schema import RegistroResposta, RegistroCriar, RegistroAtualizar
from registro.registro_service import RegistroService
from paciente.paciente_service import PacienteService
from sistema.auth import require_auth, require_role

router = APIRouter(prefix="/api/registros", tags=["Registros RAAS"])


@router.get("/", response_model=List[RegistroResposta])
def listar_registros(request: Request, month: str = Query(None), db: Session = Depends(get_db)):
    require_auth(request)
    return RegistroService.listar_todos(db, month)


@router.get("/{registro_id}", response_model=RegistroResposta)
def obter_registro(registro_id: str, request: Request, db: Session = Depends(get_db)):
    require_auth(request)
    reg = RegistroService.obter_por_id(db, registro_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    return reg


MSG_DUPLICADO = "Ação já informada (mesma data e profissional)"
MSG_DATA_ANTES_ADMISSAO = "Data de atendimento menor que a data de admissão"
MSG_MES_DIVERGENTE = "Data do atendimento fora da competência selecionada"


def _validar_data_admissao(db: Session, patient_id: str, service_date: str) -> None:
    paciente = PacienteService.obter_por_id(db, patient_id)
    if paciente and paciente.admission_date and service_date < paciente.admission_date:
        raise HTTPException(status_code=400, detail=MSG_DATA_ANTES_ADMISSAO)


def _validar_competencia(service_month: str, service_date: str) -> None:
    """Impede lançar um atendimento de um mês dentro da competência de outro."""
    if not service_month or not service_date:
        return
    if service_date[:7] != service_month:
        raise HTTPException(
            status_code=400,
            detail=f"{MSG_MES_DIVERGENTE} ({service_month})",
        )


@router.post("/", response_model=RegistroResposta)
def criar_registro(data: RegistroCriar, request: Request, db: Session = Depends(get_db)):
    require_role(request, db, "admin", "operador")
    _validar_competencia(data.service_month, data.service_date)
    _validar_data_admissao(db, data.patient_id, data.service_date)
    if RegistroService.existe_duplicado(db, data.service_date, data.patient_id, data.professional_id, data.procedure_id):
        raise HTTPException(status_code=400, detail=MSG_DUPLICADO)
    return RegistroService.criar(db, data)


@router.post("/varios", response_model=List[RegistroResposta])
def criar_varios_registros(registros: List[RegistroCriar], request: Request, db: Session = Depends(get_db)):
    require_role(request, db, "admin", "operador")
    vistos = set()
    for data in registros:
        _validar_competencia(data.service_month, data.service_date)
        _validar_data_admissao(db, data.patient_id, data.service_date)
        chave = (data.service_date, data.patient_id, data.professional_id, data.procedure_id)
        if chave in vistos or RegistroService.existe_duplicado(
            db, data.service_date, data.patient_id, data.professional_id, data.procedure_id
        ):
            raise HTTPException(status_code=400, detail=MSG_DUPLICADO)
        vistos.add(chave)
    return RegistroService.criar_varios(db, registros)


@router.put("/{registro_id}", response_model=RegistroResposta)
def atualizar_registro(registro_id: str, data: RegistroAtualizar, request: Request, db: Session = Depends(get_db)):
    require_role(request, db, "admin", "operador")
    atual = RegistroService.obter_por_id(db, registro_id)
    if not atual:
        raise HTTPException(status_code=404, detail="Registro não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    service_date = update_data.get("service_date", atual.service_date)
    patient_id = update_data.get("patient_id", atual.patient_id)
    professional_id = update_data.get("professional_id", atual.professional_id)
    procedure_id = update_data.get("procedure_id", atual.procedure_id)
    service_month = update_data.get("service_month", atual.service_month)
    _validar_competencia(service_month, service_date)
    _validar_data_admissao(db, patient_id, service_date)
    if RegistroService.existe_duplicado(
        db, service_date, patient_id, professional_id, procedure_id, excluir_id=registro_id
    ):
        raise HTTPException(status_code=400, detail=MSG_DUPLICADO)

    reg = RegistroService.atualizar(db, registro_id, data)
    return reg


@router.delete("/{registro_id}")
def deletar_registro(registro_id: str, request: Request, db: Session = Depends(get_db)):
    require_role(request, db, "admin")
    success = RegistroService.deletar(db, registro_id)
    if not success:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    return {"mensagem": "Registro excluído com sucesso"}


@router.post("/deletar-varios")
def deletar_varios(ids: List[str], request: Request, db: Session = Depends(get_db)):
    require_role(request, db, "admin")
    count = RegistroService.deletar_varios(db, ids)
    return {"mensagem": f"{count} registro(s) excluído(s)"}
