"""Tests de la zona horaria de negocio (Chile) usada para resolver a qué mes/día
pertenece un consumo o una merma. Regresión del bug real: el servidor corre en
UTC, adelantado 3-4hs a Santiago, así que cerca del cambio de mes algo cargado
de tarde/noche en Chile caía en el mes siguiente si se calculaba en UTC."""
import datetime

from backend.routers import cuentas as modulo_cuentas
from backend.routers import perdidas as modulo_perdidas
from backend.zona_horaria import ZONA_NEGOCIO


def _fijar_ahora_negocio(monkeypatch, año, mes, dia, hora, minuto):
    """Parchea `ahora_negocio` en cada módulo que lo llama (no en zona_horoaria.py,
    donde se define): `from x import y` copia la referencia al importar, así
    que patchear el origen no afecta a quien ya importó el nombre."""
    fijo = datetime.datetime(año, mes, dia, hora, minuto, tzinfo=ZONA_NEGOCIO)
    monkeypatch.setattr(modulo_cuentas, "ahora_negocio", lambda: fijo)
    monkeypatch.setattr(modulo_perdidas, "ahora_negocio", lambda: fijo)


class TestResolverPeriodoYFecha:
    def test_usa_hora_de_chile_no_utc_cerca_del_cambio_de_mes(self, monkeypatch):
        """A las 20:55 del 31/jul en Chile ya es 00:55 del 1/ago en UTC. Debe
        resolver julio (hora de negocio), no agosto (lo que daría UTC)."""
        _fijar_ahora_negocio(monkeypatch, 2026, 7, 31, 20, 55)

        mes, anio, fecha_hora = modulo_cuentas.resolver_periodo_y_fecha(None, None, None)

        assert (mes, anio) == (7, 2026)
        # La fecha_hora sigue ligada al día resuelto en UTC al mediodía, sin
        # importar el desfase: no se corre a agosto.
        assert fecha_hora == datetime.datetime(2026, 7, 31, 12, 0, tzinfo=datetime.timezone.utc)

    def test_mes_y_anio_explicitos_no_dependen_del_reloj(self, monkeypatch):
        _fijar_ahora_negocio(monkeypatch, 2026, 7, 31, 20, 55)

        mes, anio, fecha_hora = modulo_cuentas.resolver_periodo_y_fecha(3, 2025, None)

        assert (mes, anio) == (3, 2025)
        # "día" no especificado -> usa el día actual (de Chile) ajustado al mes elegido
        assert fecha_hora == datetime.datetime(2025, 3, 31, 12, 0, tzinfo=datetime.timezone.utc)

    def test_dia_explicito_se_recorta_al_ultimo_dia_del_mes(self, monkeypatch):
        _fijar_ahora_negocio(monkeypatch, 2026, 1, 15, 12, 0)

        # Febrero 2026 (no bisiesto) tiene 28 días
        mes, anio, fecha_hora = modulo_cuentas.resolver_periodo_y_fecha(2, 2026, 30)

        assert fecha_hora == datetime.datetime(2026, 2, 28, 12, 0, tzinfo=datetime.timezone.utc)


class TestLeerCuentaActualUsaHoraDeChile:
    def test_get_cuenta_sin_mes_resuelve_por_hora_de_chile(self, client, auth_headers, monkeypatch):
        """Mismo escenario que el test unitario, pero de punta a punta por HTTP:
        confirma que el endpoint que ve el frontend también usa hora de Chile."""
        _fijar_ahora_negocio(monkeypatch, 2026, 7, 31, 20, 55)

        resp = client.post("/api/v1/clientes/", json={"nombre": "Cliente Zona Horaria"})
        assert resp.status_code == 201
        cliente_id = resp.json()["id"]

        resp = client.get(f"/api/v1/cuentas/cliente/{cliente_id}")
        assert resp.status_code == 200
        cuenta = resp.json()
        assert (cuenta["mes"], cuenta["anio"]) == (7, 2026)


class TestMermasUsanHoraDeChile:
    """Las mermas no tienen selección de mes (siempre son "ahora"), así que
    dependen enteramente de que fecha_hora quede bien anclada al crearlas."""

    def _crear_producto(self, client):
        resp = client.post(
            "/api/v1/productos/",
            json={"nombre": "Producto Merma ZH", "precio_actual": "1000", "stock_actual": 50},
        )
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_merma_de_noche_en_chile_se_reporta_en_el_mes_correcto(self, client, auth_headers, monkeypatch):
        """Registrada a las 20:55 del 31/jul hora Chile (ya 1/ago en UTC), la
        merma debe aparecer en el balance de julio y NO en el de agosto."""
        _fijar_ahora_negocio(monkeypatch, 2026, 7, 31, 20, 55)
        producto_id = self._crear_producto(client)

        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": producto_id, "cantidad": 2, "motivo": "Rotura"},
        )
        assert resp.status_code == 201

        julio = client.get("/api/v1/balances/", params={"mes": 7, "anio": 2026}).json()
        agosto = client.get("/api/v1/balances/", params={"mes": 8, "anio": 2026}).json()

        assert julio["resumen"]["valor_mermas"]["actual"] == 2000
        assert agosto["resumen"]["valor_mermas"]["actual"] == 0

    def test_merma_de_noche_en_chile_se_agrupa_en_el_mes_correcto_en_evolucion(
        self, client, auth_headers, monkeypatch
    ):
        """Mismo escenario pero contra /balances/evolucion, que agrupa mermas
        con func.extract(year/month, ...) sobre la fecha_hora cruda."""
        _fijar_ahora_negocio(monkeypatch, 2026, 7, 31, 20, 55)
        producto_id = self._crear_producto(client)

        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": producto_id, "cantidad": 1, "motivo": "Vencimiento"},
        )
        assert resp.status_code == 201

        evolucion = client.get(
            "/api/v1/balances/evolucion", params={"mes": 8, "anio": 2026, "meses": 2}
        ).json()
        por_mes = {(p["mes"], p["anio"]): p["mermas"] for p in evolucion["puntos"]}

        assert por_mes[(7, 2026)] == 1000
        assert por_mes[(8, 2026)] == 0
