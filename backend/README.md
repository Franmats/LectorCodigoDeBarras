# Barcode API (Backend en TypeScript)

Servicio REST independiente para recibir lecturas de códigos de barras y depositar archivos `.csv` vacíos en una carpeta específica de un servidor Linux.

---

## Requisitos
- Node.js v18+ (recomendado Node.js 20+)
- npm

---

## 1. Desarrollo Local y Pruebas

```bash
# 1. Ingresar a la carpeta
cd backend

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo con recarga automática
npm run dev
```

El servidor iniciará en:
`http://localhost:4000`

### Probar con cURL o Postman:
```bash
curl -X POST http://localhost:4000/api/barcodes \
  -H "Content-Type: application/json" \
  -d '{"barcode": "7791234567890", "format": "EAN_13"}'
```

**Respuesta esperada (HTTP 201):**
```json
{
  "success": true,
  "message": "Archivo CSV creado exitosamente en el servidor",
  "data": {
    "barcode": "7791234567890",
    "format": "EAN_13",
    "filename": "7791234567890.csv",
    "createdAt": "2026-09-22T..."
  }
}
```

El archivo `7791234567890.csv` (vacío) se creará en la carpeta configurada en `STORAGE_DIR`.

---

## 2. Variables de Entorno (`.env`)

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto donde escucha el servidor | `4000` |
| `STORAGE_DIR` | Carpeta en el servidor donde se guardarán los `.csv` | `./storage` (o `/var/barcodes` en Linux) |
| `CORS_ORIGIN` | Dominios permitidos para peticiones CORS | `*` o URL de Vercel |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`) | `development` |

---

## 3. Despliegue en Servidor Linux

### Opción A: Con Docker Compose (Recomendada)
```bash
# 1. Copiar la carpeta backend al servidor Linux
scp -r backend usuario@tu-servidor-linux:/opt/barcode-api

# 2. En el servidor Linux, crear la carpeta de destino con permisos
sudo mkdir -p /var/barcodes
sudo chmod -R 777 /var/barcodes

# 3. Iniciar contenedor con Docker Compose
cd /opt/barcode-api
docker compose -f docker/docker-compose.yml up -d --build
```

### Opción B: Con Systemd (Nativo en Linux)
```bash
# 1. Instalar Node.js en el servidor Linux
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Copiar archivos y compilar
cd /opt/barcode-api
npm install
npm run build

# 3. Crear carpeta de destino
sudo mkdir -p /var/barcodes
sudo chmod -R 777 /var/barcodes

# 4. Configurar el servicio systemd
sudo cp deploy/barcode-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable barcode-api
sudo systemctl start barcode-api

# 5. Ver estado y logs
sudo systemctl status barcode-api
sudo journalctl -u barcode-api -f
```
