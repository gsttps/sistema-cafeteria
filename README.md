<div align="center">
  <img src="frontend/public/favicon.svg" alt="Logo Cafetería" width="120" />
  <h1>Sistema Premium de Gestión de Cuentas y Fiados</h1>
  <p><em>Automatización elegante, arquitectura robusta y seguridad empresarial para cafeterías e instituciones.</em></p>

  <!-- Badges -->
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</div>

<br />

Una aplicación web *Full-Stack* orientada a resolver una problemática clásica de las instituciones y locales gastronómicos: **el manejo seguro de cuentas abiertas y "fiados" a fin de mes**. Construido con un enfoque obsesivo en el diseño UX/UI (Glassmorphism) y en arquitecturas Backend limpias.

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

## 🔒 Auditoría y Medidas de Seguridad

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

---

## 🎨 Filosofía de Diseño UI/UX

La aplicación rechaza la idea de que el software interno de gestión deba verse aburrido o anticuado. La interfaz compite estéticamente con aplicaciones _premium_ de consumo masivo:

*   **Glassmorphism Engine:** Capas translúcidas con `backdrop-filter: blur()`, sombras CSS avanzadas (Box Shadows multicapa) y un esquema de color oscuro sofisticado (no negro absoluto, sino variables HSL curadas).
*   **Animaciones y Micro-Interacciones:** Elementos reactivos al _hover_, transiciones suaves en popups y modales modulares que bloquean el enfoque de la pantalla.
*   **Tipografía Moderna:** Carga nativa de fuentes `Inter`/`Outfit` para legibilidad máxima en pantallas financieras.

---

## ⚡ Implementación Inmediata

Atrás quedaron los días de largos tutoriales de despliegue. El proyecto incorpora scripts de instalación automatizados (`.sh` y `.bat`) para preparar entornos virtuales, instalar dependencias de Node.js y Python, y dejar el servidor listo en segundos.

### Entornos Soportados:
1. Asegúrate de tener **Docker** instalado para levantar la base de datos PostgreSQL:
   ```bash
   docker compose up -d db
   ```
2. **Si usas Linux/Mac**, simplemente ejecuta:
   ```bash
   ./instalar.sh
   ```
3. **Si usas Windows 10/11**, haz doble clic en:
   ```cmd
   instalar.bat
   ```

Una vez instaladas las dependencias, podrás iniciar tus servidores locales e ingresar al sistema con el usuario por defecto administrado por el backend de manera segura.
