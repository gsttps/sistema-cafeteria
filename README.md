<div align="center">
  <h1>Sistema de Gestión de Cuentas e inventario</h1>

  <!-- Badges -->
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</div>

<br />

Una aplicación web *Full-Stack* orientada a resolver una problemática clásica de las instituciones y locales gastronómicos: **el manejo seguro de cuentas abiertas a fin de mes**. Construido con un enfoque obsesivo en el diseño UX/UI (Glassmorphism) y en arquitecturas Backend limpias.

---

## 🛠️ Arquitectura Técnica

El sistema está estrictamente desacoplado, comunicándose a través de una API RESTful completamente documentada.

### Backend (Python / FastAPI)
*   **Motor de API Asíncrono:** Desarrollado con FastAPI, aprovechando las capacidades asíncronas de Python (Starlette) para un alto rendimiento en I/O.
*   **Validación Estricta:** Integración profunda con Pydantic para la serialización y validación estricta de datos de entrada/salida (DTOs), eliminando errores de tipo en tiempo de ejecución.
*   **Gestión de Base de Datos (ORM):** Uso de SQLAlchemy (v2.0) con sesiones asíncronas para mapeo objeto-relacional. Toda la lógica transaccional compleja ocurre aquí.
*   **Gestión de Estados e Historial:** Las cuentas no almacenan totales pre-calculados, mitigando inconsistencias de datos. Todo el cálculo de consumos, precios históricos congelados y descuentos se realiza "al vuelo" a nivel de servicio mediante consultas optimizadas.

### Frontend (React / TypeScript / Vite)
*   **Arquitectura Modular:** Componentes reutilizables fuertemente tipados. Los hooks personalizados (ej. `useClickAfuera`) centralizan el comportamiento.
*   **Estado Reactivo:** Uso de React Context API para propagar datos de negocio y validación de sesiones sin _prop-drilling_.
*   **Interceptor de Peticiones:** Integración de Axios configurado con interceptores globales y `withCredentials: true` para enviar el contexto de sesión de manera silenciosa en cada petición.

---

## Auditoría y Medidas de Seguridad

El sistema no confía en implementaciones genéricas y ha sido endurecido frente a los vectores de ataque web más comunes:

1. **Defensa contra XSS (Cross-Site Scripting):**
   * Eliminación absoluta del uso de `localStorage` para almacenamiento de credenciales.
   * La sesión JWT se almacena y viaja mediante **Cookies HttpOnly**, invisibles para JavaScript, garantizando que un script malicioso no pueda robar la sesión.
   * Se aplican desinfectadores automáticos en Pydantic (`backend/esquemas.py`) que filtran inyecciones HTML en cualquier _input_ de texto.

2. **Cabeceras de Seguridad Inyectadas (Middleware Global):**
   * `X-Content-Type-Options: nosniff` para evitar ataques de tipo MIME.
   * `X-Frame-Options: DENY` para protección contra _Clickjacking_.
   * `Content-Security-Policy (CSP)` estricto para mitigar la ejecución de scripts no autorizados.

3. **Criptografía de Contraseñas:**
   * Almacenamiento _zero-knowledge_ utilizando hashing bcrypt iterativo + salting único por usuario. (Librería `passlib`).

4. **Protección contra Fuerza Bruta (Rate Limiting):**
   * El endpoint de autenticación está protegido a nivel de aplicación con `slowapi`.
   * Límite estricto de intentos de inicio de sesión por IP para neutralizar instantáneamente ataques de diccionario o fuerza bruta.

---

## Filosofía de Diseño UI/UX

La aplicación rechaza la idea de que el software interno de gestión deba verse aburrido o anticuado. La interfaz compite estéticamente con aplicaciones _premium_ de consumo masivo:

*   **Glassmorphism Engine:** Capas translúcidas con `backdrop-filter: blur()`, sombras CSS avanzadas (Box Shadows multicapa) y un esquema de color oscuro sofisticado (no negro absoluto, sino variables HSL curadas).
*   **Animaciones y Micro-Interacciones:** Elementos reactivos al _hover_, transiciones suaves en popups y modales modulares que bloquean el enfoque de la pantalla.
*   **Tipografía Moderna:** Carga nativa de fuentes `Inter`/`Outfit` para legibilidad máxima en pantallas financieras.

---
