"""Tests de validación de esquemas Pydantic — sin base de datos."""
import pytest
from decimal import Decimal
from pydantic import ValidationError

from backend.esquemas import (
    PagoCuentaRequest,
    ClienteCrear,
    ProductoCrear,
    CategoriaCrear,
    UsuarioCrear,
)


class TestPagoCuentaRequest:
    def test_monto_none_es_valido(self):
        """Sin monto = pagar total."""
        req = PagoCuentaRequest(monto_pagado=None)
        assert req.monto_pagado is None

    def test_monto_decimal_es_valido(self):
        req = PagoCuentaRequest(monto_pagado=Decimal("150.50"))
        assert req.monto_pagado == Decimal("150.50")

    def test_monto_entero_se_convierte_a_decimal(self):
        req = PagoCuentaRequest(monto_pagado=200)
        assert req.monto_pagado == Decimal("200")

    def test_monto_cero_es_invalido(self):
        """El campo tiene gt=0, así que 0 no es válido."""
        with pytest.raises(ValidationError):
            PagoCuentaRequest(monto_pagado=0)

    def test_monto_negativo_es_invalido(self):
        with pytest.raises(ValidationError):
            PagoCuentaRequest(monto_pagado=-10)


class TestClienteCrear:
    def test_nombre_valido(self):
        c = ClienteCrear(nombre="Juan Pérez")
        assert c.nombre == "Juan Pérez"

    def test_nombre_con_html_es_rechazado(self):
        with pytest.raises(ValidationError):
            ClienteCrear(nombre="<script>alert(1)</script>")

    def test_nombre_con_javascript_es_rechazado(self):
        with pytest.raises(ValidationError):
            ClienteCrear(nombre="javascript:void(0)")

    def test_nombre_vacio_es_rechazado(self):
        with pytest.raises(ValidationError):
            ClienteCrear(nombre="")

    def test_telefono_opcional(self):
        c = ClienteCrear(nombre="Ana")
        assert c.telefono is None

    def test_telefono_valido(self):
        c = ClienteCrear(nombre="Ana", telefono="+56912345678")
        assert c.telefono == "+56912345678"

    def test_nombre_se_limpia_con_strip(self):
        c = ClienteCrear(nombre="  Juan  ")
        assert c.nombre == "Juan"


class TestProductoCrear:
    def test_precio_positivo_es_valido(self):
        p = ProductoCrear(nombre="Café", precio_actual=Decimal("1500"))
        assert p.precio_actual == Decimal("1500")

    def test_precio_cero_es_invalido(self):
        with pytest.raises(ValidationError):
            ProductoCrear(nombre="Café", precio_actual=Decimal("0"))

    def test_precio_negativo_es_invalido(self):
        with pytest.raises(ValidationError):
            ProductoCrear(nombre="Café", precio_actual=Decimal("-100"))

    def test_stock_negativo_es_invalido(self):
        with pytest.raises(ValidationError):
            ProductoCrear(nombre="Café", precio_actual=Decimal("100"), stock_actual=-1)

    def test_nombre_con_html_es_rechazado(self):
        with pytest.raises(ValidationError):
            ProductoCrear(nombre="<b>Café</b>", precio_actual=Decimal("100"))


class TestUsuarioCrear:
    def test_rol_valido(self):
        u = UsuarioCrear(username="user1", password="1234", rol="admin")
        assert u.rol == "admin"

    def test_rol_invalido_es_rechazado(self):
        with pytest.raises(ValidationError):
            UsuarioCrear(username="user1", password="1234", rol="superuser")

    def test_username_muy_corto_es_rechazado(self):
        with pytest.raises(ValidationError):
            UsuarioCrear(username="ab", password="1234")

    def test_password_muy_corta_es_rechazada(self):
        with pytest.raises(ValidationError):
            UsuarioCrear(username="user1", password="123")
