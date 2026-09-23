import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import barcodeRoutes from './routes/barcode.routes.js';

export function createApp(): Application {
  const app = express();

  // Seguridad HTTP
  app.use(helmet());

  // Habilitar CORS para permitir peticiones desde Vercel y local
  app.use(
    cors({
      origin: ENV.CORS_ORIGIN === '*' ? '*' : ENV.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // Parseo de cuerpo JSON
  app.use(express.json());

  // Logger básico de peticiones en consola
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Montar rutas de la API
  app.use('/api', barcodeRoutes);

  // Health check raíz directo
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Manejador 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
  });

  // Manejador de errores no capturados
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Global Error]', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Error interno del servidor'
    });
  });

  return app;
}
