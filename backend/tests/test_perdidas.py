"""Tests del registro de pérdidas de inventario (mermas)."""


def _crear_producto(client, nombre="Café Test Pérdida", precio="1500", stock=10):
    resp = client.post(
        "/api/v1/productos/",
        json={"nombre": nombre, "precio_actual": precio, "stock_actual": stock},
    )
    assert resp.status_code == 201
    return resp.json()


class TestPerdidas:
    def test_registrar_perdida_descuenta_stock(self, client, auth_headers):
        prod = _crear_producto(client, stock=10)
        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": prod["id"], "cantidad": 3, "motivo": "Se rompió la taza"},
        )
        assert resp.status_code == 201
        datos = resp.json()
        assert datos["cantidad"] == 3
        assert datos["motivo"] == "Se rompió la taza"
        assert datos["producto_nombre"] == prod["nombre"]
        # El costo se congela con el precio del producto al momento de la pérdida
        assert float(datos["costo_historico"]) == 1500.0

        productos = client.get("/api/v1/productos/").json()
        actualizado = next(p for p in productos if p["id"] == prod["id"])
        assert actualizado["stock_actual"] == 7

    def test_perdida_no_deja_stock_negativo(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Producto Poco Stock", stock=2)
        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": prod["id"], "cantidad": 5, "motivo": "Vencido"},
        )
        assert resp.status_code == 201

        productos = client.get("/api/v1/productos/").json()
        actualizado = next(p for p in productos if p["id"] == prod["id"])
        assert actualizado["stock_actual"] == 0

    def test_perdida_producto_inexistente_404(self, client, auth_headers):
        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": "00000000-0000-0000-0000-000000000000", "cantidad": 1},
        )
        assert resp.status_code == 404

    def test_perdida_cantidad_invalida_422(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Producto Cantidad Cero")
        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": prod["id"], "cantidad": 0},
        )
        assert resp.status_code == 422

    def test_motivo_con_html_422(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Producto Motivo XSS")
        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": prod["id"], "cantidad": 1, "motivo": "<script>alert(1)</script>"},
        )
        assert resp.status_code == 422

    def test_listar_perdidas(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Producto Listado")
        client.post("/api/v1/perdidas/", json={"producto_id": prod["id"], "cantidad": 1, "motivo": "Derramado"})
        client.post("/api/v1/perdidas/", json={"producto_id": prod["id"], "cantidad": 2})

        resp = client.get("/api/v1/perdidas/")
        assert resp.status_code == 200
        datos = resp.json()
        assert len(datos) == 2
        assert all(p["producto_nombre"] == "Producto Listado" for p in datos)

        # Filtro por producto
        resp = client.get("/api/v1/perdidas/", params={"producto_id": prod["id"]})
        assert len(resp.json()) == 2

    def test_eliminar_perdida_repone_stock(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Producto Deshacer", stock=10)
        perdida = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": prod["id"], "cantidad": 4, "motivo": "Error de registro"},
        ).json()

        resp = client.delete(f"/api/v1/perdidas/{perdida['id']}")
        assert resp.status_code == 204

        productos = client.get("/api/v1/productos/").json()
        actualizado = next(p for p in productos if p["id"] == prod["id"])
        assert actualizado["stock_actual"] == 10

        assert client.get("/api/v1/perdidas/").json() == []

    def test_eliminar_perdida_inexistente_404(self, client, auth_headers):
        resp = client.delete("/api/v1/perdidas/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404
