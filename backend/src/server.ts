import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { FileStorageService } from './services/file-storage.service.js';

const app = createApp();

// Verificar e inicializar carpeta de almacenamiento antes de escuchar
const storageService = new FileStorageService(ENV.STORAGE_DIR);
storageService.ensureDirectoryExists();

const server = app.listen(ENV.PORT, () => {
  console.log('==================================================');
  console.log(`🚀 Barcode API iniciada con éxito`);
  console.log(`📡 Puerto: ${ENV.PORT}`);
  console.log(`📁 Directorio destino CSV: ${ENV.STORAGE_DIR}`);
  console.log(`🌐 CORS permitido: ${ENV.CORS_ORIGIN}`);
  console.log(`🔗 Endpoint POST: http://localhost:${ENV.PORT}/api/barcodes`);
  console.log('==================================================');
});

// Manejo de apagado elegante (graceful shutdown) para Linux
const handleShutdown = () => {
  console.log('\nCerrando servidor de manera segura...');
  server.close(() => {
    console.log('Servidor finalizado.');
    process.exit(0);
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
