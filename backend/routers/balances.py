"""Métricas del dashboard de Balances.

CONVENCIÓN CENTRAL — caja vs. actividad comercial:

* Las métricas de CAJA (``cobrado``, ``por_cobrar``) suman las cuentas del mes
  INCLUYENDO las líneas de arrastre de deuda. Es lo correcto: al cerrar una
  cuenta con pago parcial, ``cuentas.py`` inserta un "Traspaso de deuda" con
  precio NEGATIVO, de modo que el total de la cuenta cerrada equivale
  exactamente a lo que entró en caja.
* Las métricas COMERCIALES (``ventas``, productos, categorías, ventas por día,
  ticket promedio) EXCLUYEN esos productos de arrastre, porque no son consumo
  real del cliente sino movimientos contables.

Además, una CuentaMensual puede quedar vacía (ej. si se borra su única
transacción). Por eso los contadores de actividad (clientes activos, cuentas,
ticket promedio) solo consideran cuentas con consumo real — de lo contrario un
mes con varias cuentas vacías reportaría clientes activos de más.
"""
import calendar
import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from backend.base_datos import obtener_db, verificar_rol_admin
from backend.constantes import (
    NOMBRES_MESES,
    PRODUCTO_DEUDA_ANTERIOR,
    PRODUCTO_TRASPASO_DEUDA,
    PRODUCTOS_ARRASTRE,
    UMBRAL_STOCK_BAJO,
)
from backend.esquemas import (
    BalancesMesRespuesta,
    CategoriaVenta,
    ClienteTop,
    DeudorFila,
    EvolucionRespuesta,
    MermaAgrupada,
    MetricaKPI,
    ProductoStockBajo,
    ProductoTop,
    PuntoEvolucion,
    ResumenBalance,
    VentaDia,
)
from backend.modelos import (
    Categoria,
    Cliente,
    CuentaMensual,
    PerdidaInventario,
    Producto,
    Transaccion,
    Usuario,
)

router = APIRouter(prefix="/balances", tags=["Balances y Estadísticas"])

CERO = Decimal("0.00")


# --- Helpers numéricos y de fechas -------------------------------------------------

def _dec(valor) -> Decimal:
    """Normaliza a Decimal. SQLite devuelve float en func.sum sobre Numeric,
    lo que provocaría TypeError al mezclarlo con Decimal."""
    if valor is None:
        return CERO
    if isinstance(valor, Decimal):
        return valor
    return Decimal(str(valor))


def _q(valor: Decimal) -> Decimal:
    return _dec(valor).quantize(Decimal("0.01"))


def _pct(actual: Decimal, anterior: Decimal) -> Optional[float]:
    """Variación porcentual. None si el mes anterior es 0 (evita división por
    cero e infinitos); el frontend lo muestra como '—'."""
    if anterior == 0:
        return None
    return float((actual - anterior) / anterior * 100)


def _kpi(actual: Decimal, anterior: Decimal) -> MetricaKPI:
    actual, anterior = _q(actual), _q(anterior)
    return MetricaKPI(actual=actual, anterior=anterior, variacion_pct=_pct(actual, anterior))


def _mes_anterior(mes: int, anio: int) -> tuple:
    return (12, anio - 1) if mes == 1 else (mes - 1, anio)


def _rango_utc(mes: int, anio: int) -> tuple:
    """Rango [inicio, fin) del mes en UTC. Nota: el bucketing de mermas y de
    ventas por día se hace en UTC; como transacciones y mermas anclan su
    fecha_hora al mediodía UTC del día de negocio resuelto (ver
    backend/zona_horaria.py), nada creado desde la app cambia de día/mes al
    mostrarse en es-CL, aunque se haya registrado de noche en Chile."""
    inicio = datetime.datetime(anio, mes, 1, tzinfo=datetime.timezone.utc)
    fin = datetime.datetime(anio + 1, 1, 1, tzinfo=datetime.timezone.utc) if mes == 12 \
        else datetime.datetime(anio, mes + 1, 1, tzinfo=datetime.timezone.utc)
    return inicio, fin


def _ordinal(mes: int, anio: int) -> int:
    """Índice absoluto de mes, para filtrar rangos multi-mes de forma portable."""
    return anio * 12 + mes


# --- Sub-consultas base ------------------------------------------------------------

def _sub_totales_cuenta(db: Session):
    """Bruto por cuenta INCLUYENDO arrastres → métricas de caja."""
    return (
        db.query(
            Transaccion.cuenta_mensual_id.label("cuenta_id"),
            func.sum(Transaccion.cantidad * Transaccion.precio_historico).label("bruto"),
        )
        .group_by(Transaccion.cuenta_mensual_id)
        .subquery()
    )


def _sub_totales_reales(db: Session):
    """Bruto y unidades por cuenta EXCLUYENDO arrastres → métricas comerciales.

    outerjoin porque producto_id es nullable: los pedidos personalizados sin
    producto asociado SÍ son ventas reales y no deben perderse.
    """
    return (
        db.query(
            Transaccion.cuenta_mensual_id.label("cuenta_id"),
            func.sum(Transaccion.cantidad * Transaccion.precio_historico).label("bruto"),
            func.sum(Transaccion.cantidad).label("unidades"),
        )
        .outerjoin(Producto, Producto.id == Transaccion.producto_id)
        .filter(or_(Producto.nombre.is_(None), Producto.nombre.notin_(PRODUCTOS_ARRASTRE)))
        .group_by(Transaccion.cuenta_mensual_id)
        .subquery()
    )


def _filtro_ventas_reales():
    """Condición reutilizable para excluir los productos de arrastre."""
    return or_(Producto.nombre.is_(None), Producto.nombre.notin_(PRODUCTOS_ARRASTRE))


# --- Cálculo del resumen -----------------------------------------------------------

def calcular_resumen(db: Session, mes: int, anio: int) -> dict:
    """Escalares del mes. Se invoca dos veces (mes actual y anterior) para armar
    las comparativas."""
    tot_caja = _sub_totales_cuenta(db)
    tot_real = _sub_totales_reales(db)

    # 1. Caja y contadores de cuentas, por estado
    neto = func.coalesce(tot_caja.c.bruto, 0) * (1 - CuentaMensual.porcentaje_descuento / 100)
    filas_caja = (
        db.query(
            CuentaMensual.estado,
            func.sum(neto),
            func.sum(func.coalesce(tot_caja.c.bruto, 0) * CuentaMensual.porcentaje_descuento / 100),
            func.count(CuentaMensual.id),
        )
        .outerjoin(tot_caja, tot_caja.c.cuenta_id == CuentaMensual.id)
        .filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio)
        .group_by(CuentaMensual.estado)
        .all()
    )
    cobrado = por_cobrar = descuentos = CERO
    for estado, monto, desc, _n in filas_caja:
        if estado == "pagada":
            cobrado += _dec(monto)
        else:
            por_cobrar += _dec(monto)
        descuentos += _dec(desc)

    # 2. Actividad comercial. INNER JOIN contra tot_real: descarta las cuentas
    #    vacías que crea el Panel de Atención al abrir un cliente.
    neto_real = tot_real.c.bruto * (1 - CuentaMensual.porcentaje_descuento / 100)
    ventas, unidades, clientes_activos, cuentas_con_venta = (
        db.query(
            func.coalesce(func.sum(neto_real), 0),
            func.coalesce(func.sum(tot_real.c.unidades), 0),
            func.count(func.distinct(CuentaMensual.cliente_id)),
            func.count(CuentaMensual.id),
        )
        .join(tot_real, tot_real.c.cuenta_id == CuentaMensual.id)
        .filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio, tot_real.c.bruto != 0)
        .one()
    )
    ventas = _dec(ventas)
    unidades = int(unidades or 0)
    clientes_activos = int(clientes_activos or 0)

    # Contadores de cuentas: solo las que tienen consumo real
    filas_estado = (
        db.query(CuentaMensual.estado, func.count(CuentaMensual.id))
        .join(tot_real, tot_real.c.cuenta_id == CuentaMensual.id)
        .filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio, tot_real.c.bruto != 0)
        .group_by(CuentaMensual.estado)
        .all()
    )
    cuentas_abiertas = cuentas_pagadas = 0
    for estado, n in filas_estado:
        if estado == "pagada":
            cuentas_pagadas = int(n)
        else:
            cuentas_abiertas = int(n)

    # 3. Conciliación de arrastres
    filas_arrastre = (
        db.query(Producto.nombre, func.sum(Transaccion.cantidad * Transaccion.precio_historico))
        .join(Transaccion, Transaccion.producto_id == Producto.id)
        .join(CuentaMensual, CuentaMensual.id == Transaccion.cuenta_mensual_id)
        .filter(
            CuentaMensual.mes == mes,
            CuentaMensual.anio == anio,
            Producto.nombre.in_(PRODUCTOS_ARRASTRE),
        )
        .group_by(Producto.nombre)
        .all()
    )
    deuda_arrastrada = deuda_traspasada = CERO
    for nombre, monto in filas_arrastre:
        if nombre == PRODUCTO_DEUDA_ANTERIOR:
            deuda_arrastrada = _dec(monto)
        elif nombre == PRODUCTO_TRASPASO_DEUDA:
            deuda_traspasada = abs(_dec(monto))

    # 4. Mermas del mes (por fecha_hora, no por cuenta)
    inicio, fin = _rango_utc(mes, anio)
    valor_mermas = _dec(
        db.query(func.coalesce(func.sum(PerdidaInventario.cantidad * PerdidaInventario.costo_historico), 0))
        .filter(PerdidaInventario.fecha_hora >= inicio, PerdidaInventario.fecha_hora < fin)
        .scalar()
    )

    ticket = ventas / clientes_activos if clientes_activos else CERO
    base_cobro = cobrado + por_cobrar
    tasa_cobro = float(cobrado / base_cobro * 100) if base_cobro else None

    return {
        "cobrado": cobrado,
        "por_cobrar": por_cobrar,
        "ventas": ventas,
        "ticket_promedio": ticket,
        "unidades_vendidas": Decimal(unidades),
        "descuentos": descuentos,
        "valor_mermas": valor_mermas,
        "clientes_activos": Decimal(clientes_activos),
        "cuentas_abiertas": cuentas_abiertas,
        "cuentas_pagadas": cuentas_pagadas,
        "deuda_arrastrada": deuda_arrastrada,
        "deuda_traspasada": deuda_traspasada,
        "tasa_cobro_pct": tasa_cobro,
    }


# --- Listas del dashboard ----------------------------------------------------------

def listar_deudores(db: Session, mes: int, anio: int) -> List[DeudorFila]:
    """Deuda del mes seleccionado + deuda total acumulada por cliente.

    La deuda total replica en SQL la semántica de la property Cliente.deuda
    (todas las cuentas abiertas, sin filtro de mes), evitando 79 lazy-loads.
    """
    tot = _sub_totales_cuenta(db)
    neto = func.coalesce(tot.c.bruto, 0) * (1 - CuentaMensual.porcentaje_descuento / 100)

    def _consulta(filtrar_mes: bool):
        q = (
            db.query(
                CuentaMensual.cliente_id,
                func.sum(neto).label("deuda"),
                func.count(CuentaMensual.id).label("n"),
            )
            .outerjoin(tot, tot.c.cuenta_id == CuentaMensual.id)
            .filter(CuentaMensual.estado == "abierta")
        )
        if filtrar_mes:
            q = q.filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio)
        return q.group_by(CuentaMensual.cliente_id).all()

    del_mes = {cid: (_dec(d), int(n)) for cid, d, n in _consulta(True)}
    total = {cid: _dec(d) for cid, d, _n in _consulta(False)}

    ids = {cid for cid, (d, _n) in del_mes.items() if d != 0} | {cid for cid, d in total.items() if d != 0}
    if not ids:
        return []

    clientes = db.query(Cliente).filter(Cliente.id.in_(ids)).all()
    filas = [
        DeudorFila(
            cliente_id=c.id,
            nombre=c.nombre,
            telefono=c.telefono,
            deuda_mes=_q(del_mes.get(c.id, (CERO, 0))[0]),
            deuda_total=_q(total.get(c.id, CERO)),
            cuentas_abiertas=del_mes.get(c.id, (CERO, 0))[1],
        )
        for c in clientes
    ]
    filas.sort(key=lambda f: f.deuda_total, reverse=True)
    return filas


def _base_ventas_reales(db: Session, mes: int, anio: int):
    """Query base de transacciones de venta real del mes (sin arrastres)."""
    return (
        db.query(Transaccion)
        .join(CuentaMensual, CuentaMensual.id == Transaccion.cuenta_mensual_id)
        .outerjoin(Producto, Producto.id == Transaccion.producto_id)
        .filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio, _filtro_ventas_reales())
    )


def listar_productos_top(db: Session, mes: int, anio: int, limite: int = 10) -> List[ProductoTop]:
    filas = (
        db.query(
            Producto.nombre,
            Categoria.nombre.label("categoria"),
            func.sum(Transaccion.cantidad),
            func.sum(Transaccion.cantidad * Transaccion.precio_historico),
        )
        .join(Transaccion, Transaccion.producto_id == Producto.id)
        .join(CuentaMensual, CuentaMensual.id == Transaccion.cuenta_mensual_id)
        .outerjoin(Categoria, Categoria.id == Producto.categoria_id)
        .filter(
            CuentaMensual.mes == mes,
            CuentaMensual.anio == anio,
            Producto.nombre.notin_(PRODUCTOS_ARRASTRE),
        )
        .group_by(Producto.nombre, Categoria.nombre)
        .order_by(func.sum(Transaccion.cantidad * Transaccion.precio_historico).desc())
        .limit(limite)
        .all()
    )
    return [
        ProductoTop(nombre=n, categoria=cat, cantidad_vendida=int(cant or 0), monto_vendido=_q(monto))
        for n, cat, cant, monto in filas
    ]


def listar_clientes_top(db: Session, mes: int, anio: int, limite: int = 5) -> List[ClienteTop]:
    filas = (
        db.query(
            Cliente.nombre,
            func.sum(Transaccion.cantidad * Transaccion.precio_historico),
            func.sum(Transaccion.cantidad),
        )
        .join(CuentaMensual, CuentaMensual.cliente_id == Cliente.id)
        .join(Transaccion, Transaccion.cuenta_mensual_id == CuentaMensual.id)
        .outerjoin(Producto, Producto.id == Transaccion.producto_id)
        .filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio, _filtro_ventas_reales())
        .group_by(Cliente.id, Cliente.nombre)
        .order_by(func.sum(Transaccion.cantidad * Transaccion.precio_historico).desc())
        .limit(limite)
        .all()
    )
    return [
        ClienteTop(nombre=n, total_gastado=_q(monto), unidades=int(uds or 0))
        for n, monto, uds in filas
        if _dec(monto) != 0
    ]


def listar_ventas_por_categoria(db: Session, mes: int, anio: int) -> List[CategoriaVenta]:
    filas = (
        db.query(
            func.coalesce(Categoria.nombre, "Sin categoría"),
            func.sum(Transaccion.cantidad * Transaccion.precio_historico),
            func.sum(Transaccion.cantidad),
        )
        .join(CuentaMensual, CuentaMensual.id == Transaccion.cuenta_mensual_id)
        .outerjoin(Producto, Producto.id == Transaccion.producto_id)
        .outerjoin(Categoria, Categoria.id == Producto.categoria_id)
        .filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio, _filtro_ventas_reales())
        .group_by(func.coalesce(Categoria.nombre, "Sin categoría"))
        .order_by(func.sum(Transaccion.cantidad * Transaccion.precio_historico).desc())
        .all()
    )
    return [CategoriaVenta(nombre=n, monto=_q(m), unidades=int(u or 0)) for n, m, u in filas if _dec(m) != 0]


def listar_ventas_por_dia(db: Session, mes: int, anio: int) -> tuple:
    """(serie por día, monto de consumos con fecha fuera del mes).

    Las líneas de arrastre usan el default utc_ahora (no resolver_periodo_y_fecha),
    por eso puede haber consumo cuya fecha cae fuera del mes de su cuenta; se
    reporta aparte para no inventar un día ni ocultar el monto.
    """
    inicio, fin = _rango_utc(mes, anio)
    base = _base_ventas_reales(db, mes, anio)

    filas = (
        base.with_entities(
            func.extract("day", Transaccion.fecha_hora),
            func.sum(Transaccion.cantidad * Transaccion.precio_historico),
        )
        .filter(Transaccion.fecha_hora >= inicio, Transaccion.fecha_hora < fin)
        .group_by(func.extract("day", Transaccion.fecha_hora))
        .all()
    )
    por_dia = {int(d): _dec(m) for d, m in filas if d is not None}
    dias_mes = calendar.monthrange(anio, mes)[1]
    serie = [VentaDia(dia=d, monto=_q(por_dia.get(d, CERO))) for d in range(1, dias_mes + 1)]

    fuera = _dec(
        base.with_entities(func.coalesce(func.sum(Transaccion.cantidad * Transaccion.precio_historico), 0))
        .filter(or_(Transaccion.fecha_hora < inicio, Transaccion.fecha_hora >= fin))
        .scalar()
    )
    return serie, _q(fuera)


def listar_mermas(db: Session, mes: int, anio: int) -> tuple:
    """(por motivo, por producto). Valores a PRECIO DE VENTA: el sistema no
    registra costo de compra, así que no existe margen calculable."""
    inicio, fin = _rango_utc(mes, anio)
    rango = and_(PerdidaInventario.fecha_hora >= inicio, PerdidaInventario.fecha_hora < fin)
    valor = func.sum(PerdidaInventario.cantidad * PerdidaInventario.costo_historico)

    por_motivo = (
        db.query(func.coalesce(PerdidaInventario.motivo, "Sin motivo"),
                 func.sum(PerdidaInventario.cantidad), valor)
        .filter(rango)
        .group_by(func.coalesce(PerdidaInventario.motivo, "Sin motivo"))
        .order_by(valor.desc())
        .all()
    )
    por_producto = (
        db.query(Producto.nombre, func.sum(PerdidaInventario.cantidad), valor)
        .join(Producto, Producto.id == PerdidaInventario.producto_id)
        .filter(rango)
        .group_by(Producto.nombre)
        .order_by(valor.desc())
        .limit(10)
        .all()
    )
    conv = lambda filas: [
        MermaAgrupada(etiqueta=e, unidades=int(u or 0), valor=_q(v)) for e, u, v in filas
    ]
    return conv(por_motivo), conv(por_producto)


def listar_stock_bajo(db: Session, limite: int = 15) -> List[ProductoStockBajo]:
    filas = (
        db.query(Producto, Categoria.nombre)
        .outerjoin(Categoria, Categoria.id == Producto.categoria_id)
        .filter(
            Producto.estado == "activo",
            Producto.stock_actual <= UMBRAL_STOCK_BAJO,
            # Los productos de arrastre tienen stock 0 y encabezarían siempre la alerta
            Producto.nombre.notin_(PRODUCTOS_ARRASTRE),
        )
        .order_by(Producto.stock_actual.asc(), Producto.nombre.asc())
        .limit(limite)
        .all()
    )
    return [
        ProductoStockBajo(
            nombre=p.nombre, categoria=cat,
            stock_actual=p.stock_actual, precio_actual=_q(p.precio_actual),
        )
        for p, cat in filas
    ]


def construir_balance(db: Session, mes: int, anio: int) -> BalancesMesRespuesta:
    """Payload completo del dashboard. Reutilizado por el exportador a Excel."""
    actual = calcular_resumen(db, mes, anio)
    mes_ant, anio_ant = _mes_anterior(mes, anio)
    previo = calcular_resumen(db, mes_ant, anio_ant)

    deudores = listar_deudores(db, mes, anio)
    ventas_dia, fuera_rango = listar_ventas_por_dia(db, mes, anio)
    mermas_motivo, mermas_producto = listar_mermas(db, mes, anio)

    resumen = ResumenBalance(
        cobrado=_kpi(actual["cobrado"], previo["cobrado"]),
        por_cobrar=_kpi(actual["por_cobrar"], previo["por_cobrar"]),
        ventas=_kpi(actual["ventas"], previo["ventas"]),
        ticket_promedio=_kpi(actual["ticket_promedio"], previo["ticket_promedio"]),
        unidades_vendidas=_kpi(actual["unidades_vendidas"], previo["unidades_vendidas"]),
        descuentos=_kpi(actual["descuentos"], previo["descuentos"]),
        valor_mermas=_kpi(actual["valor_mermas"], previo["valor_mermas"]),
        clientes_activos=_kpi(actual["clientes_activos"], previo["clientes_activos"]),
        cuentas_abiertas=actual["cuentas_abiertas"],
        cuentas_pagadas=actual["cuentas_pagadas"],
        clientes_con_deuda=sum(1 for d in deudores if d.deuda_total > 0),
        deuda_arrastrada=_q(actual["deuda_arrastrada"]),
        deuda_traspasada=_q(actual["deuda_traspasada"]),
        tasa_cobro_pct=actual["tasa_cobro_pct"],
    )

    return BalancesMesRespuesta(
        mes=mes,
        anio=anio,
        resumen=resumen,
        productos_top=listar_productos_top(db, mes, anio),
        clientes_top=listar_clientes_top(db, mes, anio),
        deudores=deudores,
        ventas_por_categoria=listar_ventas_por_categoria(db, mes, anio),
        ventas_por_dia=ventas_dia,
        consumo_fuera_de_rango=fuera_rango,
        mermas_por_motivo=mermas_motivo,
        mermas_por_producto=mermas_producto,
        stock_bajo=listar_stock_bajo(db),
    )


def construir_evolucion(db: Session, mes: int, anio: int, meses: int) -> List[PuntoEvolucion]:
    """Serie multi-mes en 3 queries agregadas (no N llamadas a calcular_resumen)."""
    periodos = []
    m, a = mes, anio
    for _ in range(meses):
        periodos.append((m, a))
        m, a = _mes_anterior(m, a)
    periodos.reverse()

    ord_min, ord_max = _ordinal(*periodos[0]), _ordinal(*periodos[-1])
    ordinal_col = CuentaMensual.anio * 12 + CuentaMensual.mes
    en_rango = and_(ordinal_col >= ord_min, ordinal_col <= ord_max)

    tot_caja = _sub_totales_cuenta(db)
    neto = func.coalesce(tot_caja.c.bruto, 0) * (1 - CuentaMensual.porcentaje_descuento / 100)
    caja = (
        db.query(CuentaMensual.anio, CuentaMensual.mes, CuentaMensual.estado, func.sum(neto))
        .outerjoin(tot_caja, tot_caja.c.cuenta_id == CuentaMensual.id)
        .filter(en_rango)
        .group_by(CuentaMensual.anio, CuentaMensual.mes, CuentaMensual.estado)
        .all()
    )

    tot_real = _sub_totales_reales(db)
    neto_real = tot_real.c.bruto * (1 - CuentaMensual.porcentaje_descuento / 100)
    ventas = (
        db.query(CuentaMensual.anio, CuentaMensual.mes, func.sum(neto_real))
        .join(tot_real, tot_real.c.cuenta_id == CuentaMensual.id)
        .filter(en_rango, tot_real.c.bruto != 0)
        .group_by(CuentaMensual.anio, CuentaMensual.mes)
        .all()
    )

    inicio, _ = _rango_utc(*periodos[0])
    _, fin = _rango_utc(*periodos[-1])
    mermas = (
        db.query(
            func.extract("year", PerdidaInventario.fecha_hora),
            func.extract("month", PerdidaInventario.fecha_hora),
            func.sum(PerdidaInventario.cantidad * PerdidaInventario.costo_historico),
        )
        .filter(PerdidaInventario.fecha_hora >= inicio, PerdidaInventario.fecha_hora < fin)
        .group_by(
            func.extract("year", PerdidaInventario.fecha_hora),
            func.extract("month", PerdidaInventario.fecha_hora),
        )
        .all()
    )

    m_cobrado, m_por_cobrar = {}, {}
    for an, me, estado, monto in caja:
        clave = (int(me), int(an))
        if estado == "pagada":
            m_cobrado[clave] = m_cobrado.get(clave, CERO) + _dec(monto)
        else:
            m_por_cobrar[clave] = m_por_cobrar.get(clave, CERO) + _dec(monto)
    m_ventas = {(int(me), int(an)): _dec(v) for an, me, v in ventas}
    m_mermas = {(int(me), int(an)): _dec(v) for an, me, v in mermas}

    return [
        PuntoEvolucion(
            mes=me,
            anio=an,
            etiqueta=f"{NOMBRES_MESES[me - 1][:3]} {str(an)[-2:]}",
            ventas=_q(m_ventas.get((me, an), CERO)),
            cobrado=_q(m_cobrado.get((me, an), CERO)),
            por_cobrar=_q(m_por_cobrar.get((me, an), CERO)),
            mermas=_q(m_mermas.get((me, an), CERO)),
        )
        for me, an in periodos
    ]


# --- Endpoints ---------------------------------------------------------------------

@router.get("/", response_model=BalancesMesRespuesta)
def obtener_balances(
    mes: int = Query(..., ge=1, le=12, description="Mes (1-12)"),
    anio: int = Query(..., ge=2000, le=2100, description="Año"),
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    return construir_balance(db, mes, anio)


@router.get("/evolucion", response_model=EvolucionRespuesta)
def obtener_evolucion(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    meses: int = Query(6, ge=2, le=24, description="Cantidad de meses hacia atrás"),
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    return EvolucionRespuesta(puntos=construir_evolucion(db, mes, anio, meses))


@router.get("/exportar")
def exportar_balances(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    """Libro Excel del mes: resumen, deudores, cuentas, productos, categorías,
    mermas, detalle de consumos y alertas de stock."""
    # Import local: evita un ciclo de importación (exportar_balances importa de
    # este módulo) y no penaliza el arranque de la app.
    from backend.exportar_balances import construir_libro_balances, nombre_archivo

    contenido = construir_libro_balances(db, mes, anio)
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo(mes, anio)}"'},
    )
