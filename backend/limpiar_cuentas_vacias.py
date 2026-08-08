"""Limpieza de las cuentas mensuales vacías ("cuentas fantasma").

Hasta que se corrigió, el endpoint `GET /cuentas/cliente/{id}` creaba una
CuentaMensual cada vez que alguien abría la ficha de un cliente, aunque no
comprara nada. Como el Panel de Atención consulta la cuenta de cada cliente al
listarlos, cada mes nacía una fila vacía por cliente.

Este script borra esos restos. El filtro es deliberadamente conservador: solo
elimina cuentas que no pueden contener información alguna.

    - estado = "abierta"        (nunca una cuenta cerrada/pagada)
    - sin transacciones
    - porcentaje_descuento = 0  (un descuento cargado indica intención humana)

Por defecto NO borra nada: lista lo que borraría para que puedas revisarlo.

Uso (desde la raíz del proyecto):
    backend/venv/bin/python -m backend.limpiar_cuentas_vacias
    backend/venv/bin/python -m backend.limpiar_cuentas_vacias --ejecutar
"""

import argparse
from collections import Counter
from decimal import Decimal

from backend.base_datos import SesionLocal
from backend.constantes import NOMBRES_MESES
from backend.modelos import Cliente, CuentaMensual, Transaccion


def buscar_cuentas_vacias(db):
    """Cuentas abiertas, sin consumos y sin descuento, con el nombre del cliente."""
    return (
        db.query(CuentaMensual, Cliente.nombre)
        .join(Cliente, Cliente.id == CuentaMensual.cliente_id)
        .filter(
            CuentaMensual.estado == "abierta",
            CuentaMensual.porcentaje_descuento == Decimal("0.00"),
            ~db.query(Transaccion)
            .filter(Transaccion.cuenta_mensual_id == CuentaMensual.id)
            .exists(),
        )
        .order_by(CuentaMensual.anio, CuentaMensual.mes, Cliente.nombre)
        .all()
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ejecutar",
        action="store_true",
        help="Borra de verdad. Sin este flag solo muestra qué se borraría.",
    )
    args = parser.parse_args()

    db = SesionLocal()
    try:
        vacias = buscar_cuentas_vacias(db)
        total_cuentas = db.query(CuentaMensual).count()

        if not vacias:
            print("No hay cuentas vacías que limpiar.")
            return

        for cuenta, nombre_cliente in vacias:
            print(f"  {NOMBRES_MESES[cuenta.mes - 1]} {cuenta.anio}  {nombre_cliente}")

        print(f"\n{len(vacias)} cuentas vacías de {total_cuentas} totales.")
        por_periodo = Counter((c.anio, c.mes) for c, _ in vacias)
        for (anio, mes), cantidad in sorted(por_periodo.items()):
            print(f"  {NOMBRES_MESES[mes - 1]} {anio}: {cantidad}")

        if not args.ejecutar:
            print("\nSimulación: no se borró nada. Repetí con --ejecutar para borrar.")
            return

        for cuenta, _ in vacias:
            db.delete(cuenta)
        db.commit()
        print(f"\nBorradas {len(vacias)} cuentas vacías.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
