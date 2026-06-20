# Documentación Técnica Detallada - Sistema de Cafetería (Gestión de Cuentas y Fiados)

Este documento provee un análisis exhaustivo de la arquitectura, funcionamiento, librerías, tecnologías, estructura de base de datos, lógica de negocio y endpoints del sistema de gestión de cuentas y fiados de la cafetería.

---

## 1. Arquitectura General y Flujo de Datos

El sistema está diseñado bajo una arquitectura **Cliente-Servidor Desacoplada (Headless)**:

1. **Frontend (Cliente):** Una Single Page Application (SPA) construida en React, estructurada en componentes modulares y tipado estricto con TypeScript. Utiliza un diseño de interfaz premium adaptado a la estética oscura ("Premium Dark") y translúcida (Glassmorphism).
2. **Backend (Servidor):** Una API RESTful de alto rendimiento programada en Python usando FastAPI. No realiza renderizado del lado del servidor (SSR), operando al 100% mediante intercambio de datos estructurados en formato JSON.
3. **Base de Datos:** Motor relacional PostgreSQL, donde persisten las tablas de usuarios, clientes, productos, categorías, cuentas mensuales y transacciones. La manipulación de datos se gestiona a través del ORM SQLAlchemy y la evolución del esquema mediante Alembic.

### Flujo de Datos Típico
```
Click en la UI (React) ──> Solicitud HTTP (Axios con JWT) ──> FastAPI Router 
         │                                                         │
  Re-render UI <── JSON Respuesta <── Operación DB <── SQLAlchemy ORM / Pydantic
```

---

## 2. Tecnologías y Librerías Utilizadas

### 2.1 Backend (Python 3.10+)
*   **FastAPI (v0.100.0+):** Framework moderno y rápido (rendimiento a la par de NodeJS y Go) para construir APIs, basado en anotaciones de tipos estándar de Python.
*   **Uvicorn (v0.22.0+):** Servidor web ASGI de alta velocidad para la ejecución de la aplicación asíncrona.
*   **SQLAlchemy (v2.0.0+):** ORM (Object-Relational Mapper) que mapea clases de Python a tablas SQL y maneja de manera segura las consultas mediante enlace de parámetros, eliminando el riesgo de inyecciones SQL.
*   **Alembic (v1.11.0+):** Herramienta de migración para control de versiones del esquema de base de datos.
*   **Pydantic (v2.0.0+):** Utilizado para la validación de datos de entrada/salida y definición de esquemas de API.
*   **PyJWT / python-jose (v3.3.0+):** Codificación, decodificación y validación de JSON Web Tokens (JWT) firmados criptográficamente para la gestión de sesiones.
*   **Bcrypt (v4.0.1) & Passlib (v1.7.4):** Hashing robusto y salting de contraseñas de usuario antes de su persistencia en la base de datos.
*   **Psycopg2-binary (v2.9.6):** Adaptador de base de datos PostgreSQL para Python.

### 2.2 Frontend (React 18 + TypeScript)
*   **React (v18.2.0):** Biblioteca principal para construir la interfaz de usuario basada en componentes y hooks de estado (`useState`, `useEffect`, `useMemo`).
*   **Vite (v4.3.9):** Herramienta de empaquetado (bundler) ultra rápida para desarrollo local y compilación optimizada.
*   **TypeScript (v5.0.2):** Superset de JavaScript que añade tipado estático, permitiendo detectar errores en tiempo de compilación.
*   **React Router DOM (v6.14.0):** Manejador de enrutamiento dinámico para navegar entre las vistas de Atención, Inventario, Balances y Panel de Administración sin refrescar el navegador.
*   **Axios (v1.4.0):** Cliente HTTP para realizar peticiones AJAX con interceptores automáticos para inyección del token de sesión JWT.
*   **Recharts (v3.8.1):** Librería de gráficos interactivos, utilizada para renderizar el gráfico de torta en el panel de balances.
*   **Lucide React (v1.17.0):** Conjunto de iconos vectoriales consistentes y minimalistas.
*   **TailwindCSS (v3.4.19):** Framework CSS basado en clases de utilidad, complementado con CSS clásico para animaciones avanzadas del degradado de fondo y efectos de Glassmorphism.

---

## 3. Estructura de Base de Datos y Modelos (SQLAlchemy)

Los modelos de datos se encuentran en [modelos.py](file:///home/gonza/code/cafeteria-gestion/backend/modelos.py):

*   **`Usuario` (Tabla `users`):**
    *   `id` (UUID): Identificador único de usuario.
    *   `username` (String): Nombre único de inicio de sesión.
    *   `password_hash` (String): Hash seguro de la contraseña.
    *   `rol` (String): Nivel de autorización: `'admin'` o `'staff'`.
*   **`Cliente` (Tabla `clients`):**
    *   `id` (UUID): Identificador del cliente.
    *   `nombre` (String): Nombre completo.
    *   `telefono` (String, opcional): Teléfono de contacto.
    *   `estado` (String): Estado lógico: `'activo'` (visible en el sistema) o `'inactivo'` (borrado lógico para preservar el historial financiero).
    *   *Propiedad Calculada `deuda`:* Suma de los saldos acumulados de todas las cuentas del cliente que tengan estado `'abierta'`.
    *   *Propiedad Calculada `estado_pago`:* Retorna `'deuda'` si `deuda > 0`, de lo contrario `'pagado'`.
*   **`Categoria` (Tabla `categories`):**
    *   `id` (UUID): Identificador de la categoría.
    *   `nombre` (String, único): Nombre de la categoría (ej. "Bebidas", "Pastelería").
*   **`Producto` (Tabla `products`):**
    *   `id` (UUID): Identificador del producto.
    *   `nombre` (String, único): Nombre comercial del producto.
    *   `precio_actual` (Numeric): Precio vigente del catálogo.
    *   `stock_actual` (Integer): Cantidad disponible en inventario.
    *   `categoria_id` (UUID, FK, opcional): Relación con la tabla `categories`.
*   **`CuentaMensual` (Tabla `monthly_tabs`):**
    *   `id` (UUID): Identificador único de la cuenta.
    *   `cliente_id` (UUID, FK): Cliente titular.
    *   `mes` (Integer) y `anio` (Integer): Período al que corresponde.
    *   `porcentaje_descuento` (Numeric): Descuento de 0.00% a 100.00% aplicado a la cuenta.
    *   `estado` (String): Estado del fiado: `'abierta'` (admite consumos adicionales) o `'pagada'` (cerrada/liquidada).
*   **`Transaccion` (Tabla `transactions`):**
    *   `id` (UUID): Identificador del consumo.
    *   `cuenta_mensual_id` (UUID, FK): Cuenta asociada.
    *   `producto_id` (UUID, FK, nullable): Producto consumido.
    *   `cantidad` (Integer): Cantidad consumida.
    *   `precio_historico` (Numeric): Precio al momento exacto de la transacción.
    *   `fecha_hora` (DateTime): Registro temporal con zona horaria UTC.

---

## 4. Lógica del Sistema y Decisiones de Diseño

### 4.1 Lógica de Cuentas "Multi-Tab" por Mes
El sistema no limita a un cliente a una única cuenta mensual. Si un cliente tiene consumos acumulados durante junio y decide pagar su saldo a mitad de mes, esa cuenta pasa a estado `'pagada'`. Si el cliente vuelve a consumir a finales de junio, el sistema crea automáticamente una **nueva** cuenta en estado `'abierta'` para junio, preservando el registro y los totales de la cuenta previamente liquidada de forma aislada.

### 4.2 Cálculo en Tiempo Real y Cero Redundancia
Para prevenir inconsistencias y la desincronización matemática (por ejemplo, si se eliminara o modificara directamente una transacción sin recalcular el total almacenado), **los totales generales y subtotales no se almacenan estáticamente en la base de datos**.
El total se calcula dinámicamente ("al vuelo") cuando la API procesa la cuenta:
1. Se recuperan todas las transacciones vinculadas a la cuenta.
2. Se calcula `Subtotal = Cantidad * Precio Histórico` por transacción.
3. Se calcula `Total Original = Sumatoria de Subtotales`.
4. Se deduce el descuento: `Total Final = Total Original - (Total Original * Porcentaje Descuento / 100)`.

### 4.3 Congelamiento de Precios Históricos
Cuando un cliente consume un producto, el precio actual del catálogo (`Producto.precio_actual`) se copia directamente al campo `precio_historico` del modelo `Transaccion`. Esto garantiza que los consumos pasados mantengan el precio exacto acordado en el momento de la compra, permitiendo modificar los precios en el inventario posteriormente sin alterar el saldo histórico de los clientes.

### 4.4 Pagos Flexibles y Traspaso de Deuda Intermensual
Cuando un cliente liquida su cuenta mensual, dispone de dos opciones en la ventana de pago:
1. **Pagar el Total:** El monto pagado es igual a `total_con_descuento`. La cuenta cambia su estado a `'pagada'`.
2. **Pagar un Monto Personalizado:** El cliente abona una fracción de la deuda (ej. paga $20,000 de una deuda de $25,000). Los $5,000 restantes pasan a ser una deuda acumulada para el mes siguiente mediante un algoritmo automático:
    *   El sistema calcula la diferencia: `deuda = total_con_descuento - monto_pagado`.
    *   Inserta una transacción compensatoria especial en la cuenta actual en base al producto ficticio **"Traspaso de deuda"** con un precio de `-deuda` (cantidad = 1, precio = -$5,000). Esto ajusta el total exacto de la cuenta actual para que coincida con el monto ingresado por el usuario, permitiendo marcar la cuenta del mes actual como `'pagada'` y desaparecer la deuda de dicho mes.
    *   Busca o crea automáticamente la cuenta del mes siguiente (ej. Julio) para el mismo cliente.
    *   Inserta una transacción inicial en la cuenta del mes siguiente usando el producto ficticio **"Deuda anterior"** con un precio de `+deuda` (cantidad = 1, precio = +$5,000), traspasando el saldo pendiente.

### 4.5 Control de Stock en el Inventario
Cada vez que se registra un consumo (`Transaccion`), no se altera arbitrariamente el inventario a menos que se desee. En la sección de Inventario, los administradores pueden gestionar el catálogo completo de productos vinculándolos a categorías, actualizar su información y reabastecer el stock físico.

### 4.6 Seguridad y Mitigación de Vulnerabilidades
*   **JWT en Cookies HttpOnly:** El flujo web principal establece la sesión en una cookie `httponly=True`, `secure=True` y `SameSite=Lax`. Se eliminó por completo el uso de `localStorage` para almacenar tokens o preferencias de interfaz, cerrando de raíz vulnerabilidades de inyección de código (XSS).
*   **Cabeceras HTTP de Seguridad:** Un middleware global en FastAPI inyecta cabeceras de seguridad estrictas en cada respuesta:
    *   `X-Content-Type-Options: nosniff` (previene MIME sniffing).
    *   `X-Frame-Options: DENY` (evita Clickjacking).
    *   `X-XSS-Protection: 1; mode=block` (filtro XSS activo).
    *   `Content-Security-Policy` (CSP restringido que limita la carga de scripts, fuentes e imágenes a orígenes de confianza y bloquea conexiones externas no deseadas).
*   **Desinfección de Inputs contra Inyecciones:** Los esquemas de entrada de Pydantic utilizan el validador `evitar_html_y_scripts` para examinar campos de texto críticos (`nombre`, `username`, etc.), bloqueando caracteres como `<` y `>` y palabras clave como `javascript:`, `onerror` y `onload`.
*   **Mitigación de Ataques de Fuerza Bruta:** Implementación de *Rate Limiting* en rutas sensibles (como `/api/v1/auth/login`) a través de la librería `slowapi`. Limita proactivamente la cantidad de peticiones permitidas por minuto desde una misma dirección IP, previniendo eficazmente ataques de diccionario.

---

## 5. Referencia Detallada de Endpoints (API REST)

Todas las rutas del backend tienen como prefijo base `/api/v1` (configurado en `configuracion.API_V1_STR`).

### 5.1 Autenticación (`/auth`)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Público | Autentica al usuario. Establece la cookie de sesión `access_token` y retorna el JWT. |
| `POST` | `/auth/logout` | Autenticado | Elimina la cookie `access_token` cerrando la sesión del cliente. |
| `GET` | `/auth/me` | Autenticado | Retorna la información de perfil del usuario logueado actualmente (`id`, `username`, `rol`). |
| `PUT` | `/auth/cambiar-username` | Autenticado | Cambia el nombre de usuario actual tras verificar la contraseña. Re-emite la sesión. |
| `PUT` | `/auth/cambiar-password` | Autenticado | Cambia la contraseña del usuario tras verificar la contraseña actual. Re-emite la sesión. |
| `POST` | `/auth/logo` | Autenticado | Sube un archivo de imagen (JPG/PNG) para personalizar la pantalla de login. |
| `GET` | `/auth/logo` | Público | Sirve el archivo de logo personalizado del establecimiento (si existe). |
| `DELETE` | `/auth/logo` | Autenticado | Elimina el logo personalizado del servidor. |
| `POST` | `/auth/register` | Admin / Primer Uso | Registra un nuevo usuario con rol `admin` o `staff`. El primer registro es libre; creaciones posteriores requieren token de `admin`. |

---

### 5.2 Clientes (`/clientes`)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/clientes/` | Autenticado | Obtiene la lista de clientes registrados. Soporta el parámetro opcional `buscar` para filtrar por nombre. |
| `POST` | `/clientes/` | Autenticado | Registra un nuevo cliente con estado `'activo'`. |
| `GET` | `/clientes/{cliente_id}` | Autenticado | Obtiene los detalles específicos de un cliente por su ID. |
| `PUT` | `/clientes/{cliente_id}` | Autenticado | Modifica los datos del cliente (`nombre`, `telefono`, `estado`). |
| `DELETE` | `/clientes/{cliente_id}` | Autenticado | Elimina físicamente un cliente y todos sus historiales asociados (cascada). |

---

### 5.3 Productos (`/productos`)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/productos/` | Autenticado | Obtiene la lista de todos los productos en el catálogo. Admite parámetro `buscar`. |
| `POST` | `/productos/` | Solo Admin | Crea un nuevo producto en el catálogo verificando la unicidad del nombre. |
| `PUT` | `/productos/{producto_id}` | Solo Admin | Actualiza los atributos del producto (`nombre`, `precio_actual`, `stock_actual`, `categoria_id`). |
| `DELETE` | `/productos/{producto_id}` | Solo Admin | Elimina físicamente un producto del catálogo si no tiene restricciones. |

---

### 5.4 Categorías (`/categorias`)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/categorias/` | Autenticado | Obtiene el listado de todas las categorías disponibles ordenadas alfabéticamente. |
| `POST` | `/categorias/` | Solo Admin | Registra una nueva categoría controlando que no se duplique el nombre. |
| `PUT` | `/categorias/{categoria_id}` | Solo Admin | Modifica el nombre de una categoría existente. |
| `DELETE` | `/categorias/{categoria_id}` | Solo Admin | Elimina una categoría del sistema. |

---

### 5.5 Cuentas Mensuales (`/cuentas`)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/cuentas/cliente/{cliente_id}` | Autenticado | Obtiene la cuenta abierta del cliente para el `mes` y `anio` indicados (si no se pasan, usa el mes/año actual). Si no existe una cuenta abierta, crea una nueva de manera automática. |
| `POST` | `/cuentas/cliente/{cliente_id}/agregar_item` | Autenticado | Registra el consumo de una cantidad específica de un producto. Congela el precio actual como histórico. |
| `PUT` | `/cuentas/{cuenta_id}/descuento` | Autenticado | Actualiza el porcentaje de descuento global (0 a 100) para la cuenta seleccionada. |
| `PUT` | `/cuentas/{cuenta_id}/cerrar` | Autenticado | Cierra la cuenta marcándola como `'pagada'`. Permite procesar un `monto_pagado` personalizado; de haber saldo pendiente, este se traspasa al mes siguiente. |
| `GET` | `/cuentas/cliente/{cliente_id}/historial` | Autenticado | Retorna todas las cuentas mensuales del cliente ordenadas cronológicamente en orden descendente. |
| `DELETE` | `/cuentas/transaccion/{transaccion_id}` | Autenticado | Elimina un consumo de una cuenta abierta, actualizando los saldos instantáneamente. |

---

### 5.6 Balances y Estadísticas (`/balances`)

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/balances/` | Autenticado | Genera el balance del `mes` y `anio` indicados. Calcula: Total Cobrado (cuentas pagadas), Total Pendiente (cuentas abiertas), Ranking de los 5 productos más vendidos y Ranking de los 5 clientes con mayor consumo. |

---

## 6. Módulos del Proyecto (Estructura y Responsabilidades)

El proyecto está organizado en módulos desacoplados para el Backend y el Frontend, garantizando escalabilidad y fácil mantenimiento.

### 6.1 Módulos del Backend (FastAPI)

El backend se organiza bajo una estructura modular orientada a servicios:

*   **`backend/core/` (Módulo de Configuración y Seguridad):**
    *   `configuracion.py`: Define los parámetros globales cargados desde variables de entorno (JWT SECRET, base de datos, tiempo de expiración del token).
    *   Contiene las funciones criptográficas para hash y verificación de contraseñas (`obtener_hash_contrasena`, `verificar_contrasena`) y para la firma de tokens de acceso (`crear_token_acceso`).
*   **`backend/base_datos.py` (Módulo de Conectividad y Sesión):**
    *   Gestiona el motor de conexión de SQLAlchemy con PostgreSQL.
    *   Provee la dependencia `obtener_db` para la inyección de la sesión de base de datos en los endpoints.
    *   Maneja la autenticación y extracción del token JWT de las solicitudes (`obtener_usuario_actual`, `verificar_rol_admin`).
*   **`backend/modelos.py` (Módulo de Modelos de Base de Datos):**
    *   Define el esquema de la base de datos a través de clases SQLAlchemy (`Usuario`, `Cliente`, `Categoria`, `Producto`, `CuentaMensual`, `Transaccion`).
    *   Establece las relaciones clave y cascading deletes.
*   **`backend/esquemas.py` (Módulo de Validación Pydantic):**
    *   Define los esquemas de entrada y salida (DTOs) para validar los tipos de datos en cada petición REST.
    *   Implementa reciclaje de código mediante alias para esquemas idénticos (ej. `CategoriaActualizar = CategoriaCrear`).
    *   Contiene desinfectadores de texto personalizados (`evitar_html_y_scripts`) para prevenir ataques XSS.
*   **`backend/routers/` (Módulo de Controladores / Endpoints):**
    *   `clientes.py`: Controla la gestión de perfiles de clientes, incluyendo su creación, lectura, actualización y eliminación.
    *   `productos.py`: Gestiona el inventario del catálogo de productos y el stock físico (Admin-only).
    *   `categorias.py`: Permite catalogar los productos para una mejor organización y filtrado (Admin-only).
    *   `cuentas.py`: Core del negocio. Maneja la adición de consumos (congelando precios), la asignación de descuentos y el cierre de cuentas (procesando pagos y traspasando deudas automáticamente al mes siguiente).
    *   `balances.py`: Provee métricas acumuladas (pagado vs pendiente) y clasificaciones top-5 para el dashboard financiero.

### 6.2 Módulos del Frontend (React + TypeScript)

El frontend está estructurado para maximizar la reutilización de componentes y optimizar el rendimiento:

*   **`src/types/index.ts` (Módulo de Tipos):**
    *   Define las interfaces de TypeScript que representan los tipos del negocio (coincidentes con los esquemas Pydantic del backend).
*   **`src/services/api.ts` (Módulo de Servicios HTTP):**
    *   Configura la instancia global de Axios con `withCredentials: true`.
    *   Gestiona automáticamente el envío de la sesión (cookie HttpOnly) al servidor en cada petición sin necesidad de inyectar cabeceras manuales.
*   **`src/hooks/` (Módulo de Hooks Personalizados - Código Reciclado):**
    *   `useClickAfuera.ts`: Hook centralizado para cerrar modales/popups al hacer clic fuera del contenedor. Reemplazó la lógica duplicada en los selectores.
*   **`src/utils/` (Módulo de Utilidades - Código Reciclado):**
    *   `formato.ts`: Centraliza funciones de formateo recurrentes como `formatoDinero` y `formatearFechaHora`, eliminando su repetición en 5 componentes distintos.
*   **`src/components/` (Módulo de Componentes Reutilizables):**
    *   Contiene los componentes de interfaz modulares que consumen los hooks compartidos:
        *   `MenuDesplegable.tsx`: Desplegable elegante con soporte de iconos Lucide y colores.
        *   `ResumenPestanas.tsx`: Panel que calcula subtotales, descuentos y totales dinámicamente con guardado asíncrono debounced.
        *   `SelectorMes.tsx`: Selector interactivo de mes y año con grilla desplegable.
        *   `SelectorPremium.tsx`: Botón selector multi-opción de estilo premium.
*   **`src/pages/` (Módulo de Vistas / Páginas Principales):**
    *   `InicioSesion/InicioSesion.tsx`: Pantalla de login segura con animación y carga del logo dinámico del establecimiento.
    *   `PanelAtencion/PanelAtencion.tsx`: Panel principal de operaciones donde se busca, registra y edita a los clientes, se cargan sus consumos y se gestionan sus estados.
    *   `PanelAtencion/ModalPagoParcial.tsx`: Interfaz modal interactiva para procesar pagos totales o abonos personalizados (fiados).
    *   `Inventario/Inventario.tsx`: Módulo para administrar el catálogo físico de productos, categorías y stock de manera ordenada.
    *   `Balances/Balances.tsx`: Dashboard interactivo que muestra las ganancias y los indicadores clave mediante gráficos de torta (Recharts).
    *   `PanelAdmin/PanelAdmin.tsx`: Vista de administración de credenciales de seguridad y personalización visual (subida de logo).
