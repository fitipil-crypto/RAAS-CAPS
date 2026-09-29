"""
Testes do backup: as barras de progresso do front dependem dos cabeçalhos
Content-Length (percentual do download) e Content-Disposition (nome do arquivo).
"""


def test_download_backup_traz_cabecalhos_de_progresso(auth_client):
    resp = auth_client.get("/api/backup/download")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    assert int(resp.headers["content-length"]) == len(resp.content)
    assert "filename=backup_raas_caps_" in resp.headers["content-disposition"]


def test_restaurar_backup_com_arquivo_invalido_retorna_detalhe(auth_client):
    resp = auth_client.post(
        "/api/backup/restaurar",
        files={"file": ("ruim.json", b"nao eh json", "application/json")},
    )
    assert resp.status_code == 400
    assert isinstance(resp.json()["detail"], str)


def test_ciclo_backup_restauracao(auth_client):
    pac = auth_client.post("/api/pacientes/", json={
        "name": "PACIENTE BACKUP", "cns": "700000000000009",
        "birth_date": "1985-05-05", "gender": "F",
    })
    assert pac.status_code == 200, pac.text

    conteudo = auth_client.get("/api/backup/download").content
    resp = auth_client.post(
        "/api/backup/restaurar",
        files={"file": ("backup.json", conteudo, "application/json")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    nomes = [p["name"] for p in auth_client.get("/api/pacientes/").json()]
    assert "PACIENTE BACKUP" in nomes
