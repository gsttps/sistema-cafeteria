# ☕ Sistema de Gestión de Cuentas y Fiados - Cafetería

Una aplicación web full-stack diseñada para automatizar, modernizar y asegurar el registro de cuentas y fiados en cafeterías, reemplazando las planillas manuales por un sistema fluido, elegante y escalable.

---

## 📑 Tabla de Contenidos
1. [Visión General del Producto](#1-visión-general-del-producto)
2. [Arquitectura y Stack Tecnológico](#2-arquitectura-y-stack-tecnológico)
3. [Características y Funcionalidades Principales](#3-características-y-funcionalidades-principales)
4. [Esquema de Base de Datos y Lógica de Negocio](#4-esquema-de-base-de-datos-y-lógica-de-negocio)
5. [Decisiones de UI/UX (Frontend)](#5-decisiones-de-uiux-frontend)
6. [Instalación y Primeros Pasos](#6-instalación-y-primeros-pasos)
7. [Seguridad](#7-seguridad)

---

## 1. Visión General del Producto
El sistema resuelve la problemática clásica de las cafeterías e instituciones: el manejo de "fiados" (cuentas abiertas a pagar a fin de mes). 
Permite administrar clientes recurrentes, mantener un catálogo de productos con precios actualizados y registrar cada consumo (transacción) en una cuenta mensual por cliente. Soporta pagos totales, pagos parciales en el mismo mes, y aplicación de porcentajes de descuento sobre el total consumido, todo en tiempo real.

---

## 2. Arquitectura y Stack Tecnológico
El proyecto está estrictamente desacoplado en dos repositorios/carpetas, comunicados mediante una API RESTful en formato JSON.

### Backend (Python)
*   **Framework:** **FastAPI** (Python 3.10+) - Elegido por su velocidad, validación asíncrona de datos con Pydantic y documentación automática.
*   **ORM:** **SQLAlchemy** - Abstrae la lógica SQL y mapea las entidades.
*   **Migraciones:** **Alembic** - Permite evolucionar el esquema de base de datos sin perder datos.
*   **Base de Datos:** **PostgreSQL** corriendo en un contenedor aislado con Docker.

### Frontend (React)
*   **Framework:** **React 18** con **TypeScript** para un tipado estático robusto.
*   **Bundler:** **Vite** para tiempos de compilación instantáneos en desarrollo.
*   **Librerías clave:** `React Router DOM` para navegación SPA y `Axios` para peticiones HTTP con interceptores JWT.

---

## 3. Características y Funcionalidades Principales

- **Gestión de Cuentas Multi-Tabs:** Los clientes no están limitados a una sola cuenta por mes. Si un cliente liquida su deuda a mitad de mes y luego vuelve a consumir, el sistema automáticamente genera una "nueva" cuenta para ese mismo mes, manteniendo el historial del primer pago de forma transparente.
- **Congelamiento de Precios Históricos:** Al agregar un producto a la cuenta de un cliente, el precio en ese instante se "congela" en la transacción. Si el precio del café sube la semana siguiente, los consumos previos no se ven afectados.
- **Descuentos Dinámicos:** Permite aplicar un % de descuento global a la cuenta mensual en cualquier momento antes del cierre.
- **Historial Consolidado:** Los consumos ya pagados en el mismo mes se agrupan y muestran visualmente diferenciados para dar contexto, sumando un indicador de "Ya pagado en el mes".

---

## 4. Esquema de Base de Datos y Lógica de Negocio

La base de datos relacional (PostgreSQL) está diseñada para garantizar la integridad financiera:

1. **`usuarios`**: Manejo de roles (`admin`, `staff`) y contraseñas hasheadas (bcrypt).
2. **`clientes`**: Información de contacto y estado lógico (`activo`/`inactivo`).
3. **`productos`**: Catálogo centralizado.
4. **`cuentas_mensuales`**: Agrupa consumos por `cliente_id`, `mes` y `anio`. Guarda el `estado` (`abierta` o `pagada`) y el `porcentaje_descuento`.
5. **`transacciones`**: Cada ítem individual. Almacena la `cantidad` y el `precio_historico`.

### Cálculo en Tiempo Real
El backend no guarda el `total` final en la base de datos para evitar inconsistencias. FastAPI calcula los totales "al vuelo" cada vez que se pide una cuenta: suma `(cantidad * precio_historico)` de cada transacción, y aplica la matemática del descuento devolviendo totales precisos.

---

## 5. Decisiones de UI/UX (Frontend)

El frontend ha sido pulido con una atención extrema al detalle visual y de interacción, buscando un aspecto **Premium** y **Moderno**:

- **Estética Glassmorphism:** Uso de `backdrop-filter: blur()`, fondos translúcidos y sombras suaves para dar profundidad a la interfaz.
- **Modales de Confirmación:** Al intentar eliminar un producto de una lista, la pantalla completa se oscurece y desenfoca, forzando la atención del usuario en el cuadro de diálogo central. Esto evita eliminaciones accidentales.
- **Inputs Matemáticos Naturales:** El campo de descuento permite la escritura libre (0-100) sin las molestas flechas predeterminadas del navegador (`type="text"` con validación regex en lugar de `type="number"`).
- **Feedback Visual Inmediato:** 
  - Los productos ya pagados en el mes actual aparecen en la cuenta en color gris, tachados y con una etiqueta verde de "PAGADO".
  - Las transacciones muestran sutilmente la fecha y hora de carga (`DD/MM HH:MM`).

---

## 6. Instalación y Primeros Pasos

### 6.1. Requisitos Previos
*   Docker y Docker Compose instalados.
*   Python 3.10+ (para desarrollo local sin Docker del backend).
*   Node.js 18+ y npm (para desarrollo del frontend).

### 6.2. Configuración de Entorno
Copia el archivo `.env.example` como `.env` en el directorio raíz:
```bash
cp .env.example .env
```

### 6.3. Levantar la Base de Datos
Inicia el contenedor de PostgreSQL:
```bash
docker compose up -d db
```

### 6.4. Ejecutar el Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head    # Aplica las migraciones a la BD
uvicorn main:app --reload
```

### 6.5. Ejecutar el Frontend
Abre otra terminal:
```bash
cd frontend
npm install
npm run dev
```

---

## 7. Seguridad

*   **Autenticación y Sesión:** JWT (JSON Web Tokens) gestionan la sesión. El frontend intercepta solicitudes 401 para redirigir al login si el token expira.
*   **Protección de Contraseñas:** Se utiliza `passlib` con `bcrypt` para aplicar "salting" y hashing a las contraseñas, previniendo ataques de Rainbow Tables.
*   **Inyección de Datos:** El uso del ORM SQLAlchemy y la validación de esquemas Pydantic garantizan que los tipos de datos son estrictos y bloquean ataques clásicos de inyección SQL.
