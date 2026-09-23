# Etapa 1: Construcción
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Etapa 2: Producción
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV STORAGE_DIR=/var/barcodes

# Crear usuario seguro sin privilegios de root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Crear carpeta de almacenamiento con permisos adecuados
RUN mkdir -p /var/barcodes && chown -R appuser:appgroup /var/barcodes

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

USER appuser

EXPOSE 4000

CMD ["node", "dist/server.js"]
