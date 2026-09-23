import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  // Por defecto usa la carpeta local 'storage' si no está en Linux o no está definida
  STORAGE_DIR: process.env.STORAGE_DIR 
    ? path.resolve(process.env.STORAGE_DIR) 
    : path.resolve(process.cwd(), 'storage'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
