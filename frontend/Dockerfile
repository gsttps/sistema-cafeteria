# --- Etapa de Compilación ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inyectar la variable de entorno para que el frontend use peticiones relativas al mismo host/puerto
ENV VITE_API_URL=/api/v1

RUN npm run build

# --- Etapa de Producción ---
FROM nginx:alpine

# Copiar la configuración del proxy de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos generados por Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
