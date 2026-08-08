"""Zona horaria del negocio (Chile), compartida entre routers para decidir a
qué día/mes de calendario pertenece algo creado "ahora" (un consumo, una merma).
El servidor corre en UTC, adelantado 3-4hs a Santiago: sin esto, lo registrado
entre las 20:00 y medianoche hora Chile caía en el día/mes siguiente."""
import datetime
from zoneinfo import ZoneInfo

ZONA_NEGOCIO = ZoneInfo("America/Santiago")


def ahora_negocio() -> datetime.datetime:
    """Hora actual en la zona horaria del negocio."""
    return datetime.datetime.now(ZONA_NEGOCIO)


def fecha_hora_negocio(anio: int, mes: int, dia: int) -> datetime.datetime:
    """Fecha ancla en UTC al mediodía del día de negocio dado. Mediodía ± el
    desfase de Chile con UTC nunca cruza medianoche, así que lo que se guarda
    no cambia de día calendario sin importar en qué zona horaria se lea
    después (balances.py depende de esta invariante para agrupar por mes/día)."""
    return datetime.datetime(anio, mes, dia, 12, 0, 0, tzinfo=datetime.timezone.utc)
