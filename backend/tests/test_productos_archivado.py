"""Tests de impacto, archivado/reactivación de productos y actualización de
precios en cuentas abiertas (las cuentas pagadas nunca se modifican)."""


def _crear_producto(client, nombre="Producto Test", precio="1000", stock=0):
    resp = client.post(
        "/api/v1/productos/",
        json={"nombre": nombre, "precio_actual": precio, "stock_actual": stock},
    )
    assert resp.status_code == 201
    return resp.json()


def _crear_cliente(client, nombre="Cliente Test"):
    resp = client.post("/api/v1/clientes/", json={"nombre": nombre})
    assert resp.status_code == 201
    return resp.json()


def _agregar_item(client, cliente_id, producto_id, cantidad=1):
    resp = client.post(
        f"/api/v1/cuentas/cliente/{cliente_id}/agregar_item",
        json={"producto_id": producto_id, "cantidad": cantidad},
    )
    assert resp.status_code == 200
    return resp.json()


def _pagar_cuenta_actual(client, cliente_id):
    cuenta = client.get(f"/api/v1/cuentas/cliente/{cliente_id}").json()
    resp = client.put(f"/api/v1/cuentas/{cuenta['id']}/cerrar", json={})
    assert resp.status_code == 200
    return cuenta


class TestImpacto:
    def test_impacto_producto_sin_uso(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Sin Uso")
        resp = client.get(f"/api/v1/productos/{prod['id']}/impacto")
        assert resp.status_code == 200
        datos = resp.json()
        assert datos["tiene_uso"] is False
        assert datos["cuentas_abiertas"] == {"clientes": 0, "transacciones": 0, "unidades": 0}
        assert datos["cuentas_pagadas"] == {"clientes": 0, "transacciones": 0, "unidades": 0}
        assert datos["perdidas"] == 0

    def test_impacto_desglosa_abiertas_y_pagadas(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Impacto Mixto", precio="1000")
        cliente_a = _crear_cliente(client, "Cliente Abierta")
        cliente_b = _crear_cliente(client, "Cliente Pagada")

        _agregar_item(client, cliente_a["id"], prod["id"], cantidad=2)
        _agregar_item(client, cliente_b["id"], prod["id"], cantidad=3)
        _pagar_cuenta_actual(client, cliente_b["id"])

        resp = client.get(f"/api/v1/productos/{prod['id']}/impacto")
        datos = resp.json()
        assert datos["cuentas_abiertas"] == {"clientes": 1, "transacciones": 1, "unidades": 2}
        assert datos["cuentas_pagadas"] == {"clientes": 1, "transacciones": 1, "unidades": 3}
        assert datos["tiene_uso"] is True

    def test_impacto_incluye_perdidas(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Con Perdida", stock=10)
        client.post("/api/v1/perdidas/", json={"producto_id": prod["id"], "cantidad": 1})

        resp = client.get(f"/api/v1/productos/{prod['id']}/impacto")
        datos = resp.json()
        assert datos["perdidas"] == 1
        assert datos["tiene_uso"] is True

    def test_impacto_producto_inexistente_404(self, client, auth_headers):
        resp = client.get("/api/v1/productos/00000000-0000-0000-0000-000000000000/impacto")
        assert resp.status_code == 404


class TestActualizarPrecio:
    def test_default_no_toca_precios_historicos(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Precio Default", precio="1000")
        cliente = _crear_cliente(client, "Cliente Precio Default")
        _agregar_item(client, cliente["id"], prod["id"])

        client.put(f"/api/v1/productos/{prod['id']}", json={"precio_actual": "2000"})

        cuenta = client.get(f"/api/v1/cuentas/cliente/{cliente['id']}").json()
        assert float(cuenta["transacciones"][0]["precio_historico"]) == 1000.0

    def test_flag_actualiza_solo_cuentas_abiertas(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Precio Flag", precio="1000")
        cliente_abierta = _crear_cliente(client, "Cliente Abierta Flag")
        cliente_pagada = _crear_cliente(client, "Cliente Pagada Flag")

        _agregar_item(client, cliente_abierta["id"], prod["id"])
        _agregar_item(client, cliente_pagada["id"], prod["id"])
        _pagar_cuenta_actual(client, cliente_pagada["id"])

        resp = client.put(
            f"/api/v1/productos/{prod['id']}",
            json={"precio_actual": "2000", "actualizar_precios_abiertos": True},
        )
        assert resp.status_code == 200

        cuenta_abierta = client.get(f"/api/v1/cuentas/cliente/{cliente_abierta['id']}").json()
        assert float(cuenta_abierta["transacciones"][0]["precio_historico"]) == 2000.0

        historial_pagada = client.get(f"/api/v1/cuentas/cliente/{cliente_pagada['id']}/historial").json()
        cuenta_pagada = next(c for c in historial_pagada if c["estado"] == "pagada")
        assert float(cuenta_pagada["transacciones"][0]["precio_historico"]) == 1000.0

    def test_flag_sin_cambio_de_precio_no_hace_nada(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Precio Sin Cambio", precio="1000")
        cliente = _crear_cliente(client, "Cliente Sin Cambio")
        _agregar_item(client, cliente["id"], prod["id"])

        resp = client.put(
            f"/api/v1/productos/{prod['id']}",
            json={"stock_actual": 5, "actualizar_precios_abiertos": True},
        )
        assert resp.status_code == 200

        cuenta = client.get(f"/api/v1/cuentas/cliente/{cliente['id']}").json()
        assert float(cuenta["transacciones"][0]["precio_historico"]) == 1000.0


class TestEliminarProducto:
    def test_sin_uso_elimina_definitivamente(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Eliminar Definitivo")
        resp = client.delete(f"/api/v1/productos/{prod['id']}")
        assert resp.status_code == 200
        assert resp.json()["resultado"] == "eliminado"

        nombres = [p["nombre"] for p in client.get("/api/v1/productos/", params={"incluir_archivados": True}).json()]
        assert "Eliminar Definitivo" not in nombres

    def test_con_solo_perdidas_archiva(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Solo Perdidas", stock=5)
        client.post("/api/v1/perdidas/", json={"producto_id": prod["id"], "cantidad": 1})

        resp = client.delete(f"/api/v1/productos/{prod['id']}")
        assert resp.status_code == 200
        assert resp.json()["resultado"] == "archivado"

        # El historial de pérdidas sigue existiendo (el FK es CASCADE; un hard-delete lo habría borrado)
        perdidas = client.get("/api/v1/perdidas/", params={"producto_id": prod["id"]}).json()
        assert len(perdidas) == 1

    def test_archivado_desaparece_pero_incluir_archivados_lo_muestra(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Ver Archivado", stock=5)
        cliente = _crear_cliente(client, "Cliente Ver Archivado")
        _agregar_item(client, cliente["id"], prod["id"])

        client.delete(f"/api/v1/productos/{prod['id']}")

        nombres_normal = [p["nombre"] for p in client.get("/api/v1/productos/").json()]
        assert "Ver Archivado" not in nombres_normal

        con_archivados = client.get("/api/v1/productos/", params={"incluir_archivados": True}).json()
        archivado = next(p for p in con_archivados if p["nombre"] == "Ver Archivado")
        assert archivado["estado"] == "archivado"
        assert archivado["stock_actual"] == 0


class TestReactivacion:
    def test_post_nombre_archivado_reactiva_mismo_id(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Reactivar", precio="1000", stock=3)
        cliente = _crear_cliente(client, "Cliente Reactivar")
        _agregar_item(client, cliente["id"], prod["id"])
        client.delete(f"/api/v1/productos/{prod['id']}")

        resp = client.post(
            "/api/v1/productos/",
            json={"nombre": "Reactivar", "precio_actual": "1500", "stock_actual": 8},
        )
        assert resp.status_code == 201
        datos = resp.json()
        assert datos["id"] == prod["id"]
        assert datos["estado"] == "activo"
        assert float(datos["precio_actual"]) == 1500.0
        assert datos["stock_actual"] == 8

        # El historial previo del cliente sigue apuntando al mismo producto
        historial = client.get(f"/api/v1/cuentas/cliente/{cliente['id']}/historial").json()
        nombres = [t["producto_nombre"] for c in historial for t in c["transacciones"]]
        assert "Reactivar" in nombres

    def test_post_nombre_producto_activo_sigue_dando_409(self, client, auth_headers):
        _crear_producto(client, nombre="Activo Duplicado")
        resp = client.post(
            "/api/v1/productos/",
            json={"nombre": "Activo Duplicado", "precio_actual": "999"},
        )
        assert resp.status_code == 409

    def test_pedido_personalizado_reactiva_archivado(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Personalizado Reactivar", precio="1000")
        cliente = _crear_cliente(client, "Cliente Personalizado Reactivar")
        _agregar_item(client, cliente["id"], prod["id"])
        client.delete(f"/api/v1/productos/{prod['id']}")

        resp = client.post(
            f"/api/v1/cuentas/cliente/{cliente['id']}/pedido_personalizado",
            json={"nombre": "Personalizado Reactivar", "precio": "2500", "cantidad": 1},
        )
        assert resp.status_code == 200

        con_archivados = client.get("/api/v1/productos/").json()
        reactivado = next(p for p in con_archivados if p["nombre"] == "Personalizado Reactivar")
        assert reactivado["estado"] == "activo"
        assert float(reactivado["precio_actual"]) == 2500.0


class TestDefensasArchivado:
    def test_agregar_item_producto_archivado_409(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Archivado Vender")
        cliente = _crear_cliente(client, "Cliente Archivado Vender")
        _agregar_item(client, cliente["id"], prod["id"])
        client.delete(f"/api/v1/productos/{prod['id']}")

        resp = client.post(
            f"/api/v1/cuentas/cliente/{cliente['id']}/agregar_item",
            json={"producto_id": prod["id"], "cantidad": 1},
        )
        assert resp.status_code == 409

    def test_registrar_perdida_producto_archivado_409(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Archivado Perdida", stock=5)
        cliente = _crear_cliente(client, "Cliente Archivado Perdida")
        _agregar_item(client, cliente["id"], prod["id"])
        client.delete(f"/api/v1/productos/{prod['id']}")

        resp = client.post(
            "/api/v1/perdidas/",
            json={"producto_id": prod["id"], "cantidad": 1},
        )
        assert resp.status_code == 409


class TestBalancesConArchivados:
    def test_top_productos_incluye_ventas_de_archivados(self, client, auth_headers):
        prod = _crear_producto(client, nombre="Archivado Con Ventas", precio="1000")
        cliente = _crear_cliente(client, "Cliente Balances Archivado")
        cuenta_antes = client.get(f"/api/v1/cuentas/cliente/{cliente['id']}").json()
        _agregar_item(client, cliente["id"], prod["id"], cantidad=5)
        client.delete(f"/api/v1/productos/{prod['id']}")

        resp = client.get(
            "/api/v1/balances/",
            params={"mes": cuenta_antes["mes"], "anio": cuenta_antes["anio"]},
        )
        assert resp.status_code == 200
        nombres_top = [p["nombre"] for p in resp.json()["productos_top"]]
        assert "Archivado Con Ventas" in nombres_top
