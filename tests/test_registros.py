"""
Testes de lançamento manual de registros RAAS.
"""
import pytest


@pytest.fixture
def base_ids(auth_client):
    """Cria paciente, profissional e procedimento e devolve seus ids."""
    pac = auth_client.post("/api/pacientes/", json={
        "name": "PACIENTE TESTE", "cns": "700000000000000",
        "birth_date": "1990-01-01", "gender": "M",
    })
    assert pac.status_code == 200, pac.text
    prof = auth_client.post("/api/profissionais/", json={
        "name": "PROFISSIONAL TESTE", "cns": "700000000000001", "cbo": "225125",
    })
    assert prof.status_code == 200, prof.text
    proc = auth_client.post("/api/procedimentos/", json={
        "code": "0301080020", "name": "ATENDIMENTO INDIVIDUAL",
    })
    assert proc.status_code == 200, proc.text
    return {
        "patient_id": pac.json()["id"],
        "professional_id": prof.json()["id"],
        "procedure_id": proc.json()["id"],
    }


def _payload(base_ids, service_month, service_date):
    return {**base_ids, "service_month": service_month, "service_date": service_date}


def test_criar_registro_na_competencia_correta(auth_client, base_ids):
    resp = auth_client.post("/api/registros/", json=_payload(base_ids, "2026-08", "2026-08-15"))
    assert resp.status_code == 200, resp.text
    assert resp.json()["service_month"] == "2026-08"


def test_recusa_registro_de_outro_mes(auth_client, base_ids):
    resp = auth_client.post("/api/registros/", json=_payload(base_ids, "2026-08", "2026-09-10"))
    assert resp.status_code == 400
    assert "competência" in resp.json()["detail"]


def test_recusa_lote_com_data_de_outro_mes(auth_client, base_ids):
    payloads = [
        _payload(base_ids, "2026-08", "2026-08-10"),
        _payload(base_ids, "2026-08", "2026-09-10"),
    ]
    resp = auth_client.post("/api/registros/varios", json=payloads)
    assert resp.status_code == 400
    assert "competência" in resp.json()["detail"]
    # nenhum dos dois pode ter sido gravado
    assert auth_client.get("/api/registros/?month=2026-08").json() == []


def test_recusa_edicao_que_joga_data_para_outro_mes(auth_client, base_ids):
    criado = auth_client.post("/api/registros/", json=_payload(base_ids, "2026-08", "2026-08-15"))
    reg_id = criado.json()["id"]
    resp = auth_client.put(f"/api/registros/{reg_id}", json={"service_date": "2026-09-15"})
    assert resp.status_code == 400
    assert "competência" in resp.json()["detail"]
    assert auth_client.get(f"/api/registros/{reg_id}").json()["service_date"] == "2026-08-15"


def test_pagina_marca_linhas_com_id_do_registro(auth_client, base_ids):
    """A exclusão no front usa data-registro-id para achar o grupo do paciente
    e reabri-lo, em vez de recarregar a página (que fecharia todos os grupos)."""
    criado = auth_client.post("/api/registros/", json=_payload(base_ids, "2026-08", "2026-08-15"))
    reg_id = criado.json()["id"]

    html = auth_client.get("/registros?month=2026-08").text
    assert f'data-registro-id="{reg_id}"' in html
    assert f'data-patient-id="{base_ids["patient_id"]}"' in html
