import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

export interface FileCreationResult {
  filename: string;
  fullPath: string;
  barcode: string;
  createdAt: string;
}

export class FileStorageService {
  private targetDirectory: string;

  constructor(targetDir: string = ENV.STORAGE_DIR) {
    this.targetDirectory = targetDir;
    this.ensureDirectoryExists();
  }

  /**
   * Asegura que el directorio exista en el sistema de archivos (útil para carpetas en Linux).
   */
  public ensureDirectoryExists(): void {
    if (!fs.existsSync(this.targetDirectory)) {
      fs.mkdirSync(this.targetDirectory, { recursive: true });
      console.log(`[FileStorageService] Directorio creado: ${this.targetDirectory}`);
    }
  }

  /**
   * Sanitiza el código de barras para generar un nombre de archivo seguro en Linux,
   * evitando ataques de Path Traversal (ej. ../../etc/passwd) o caracteres prohibidos.
   */
  public sanitizeFilename(barcode: string): string {
    const trimmed = barcode.trim();
    if (!trimmed) {
      throw new Error('El código de barras no puede estar vacío');
    }

    // Remueve caracteres peligrosos y secuencias de navegación de rutas
    // Permite alfanuméricos, guiones y guiones bajos comunes en códigos de barras
    const sanitized = trimmed
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/[\x00-\x1f\x80-\x9f]/g, '');

    if (!sanitized) {
      throw new Error('El código de barras no contiene caracteres válidos para el nombre de archivo');
    }

    return `${sanitized}.csv`;
  }

  /**
   * Crea un archivo CSV vacío con el nombre del código de barras en el directorio especificado.
   */
  public createEmptyCsv(barcode: string): FileCreationResult {
    this.ensureDirectoryExists();

    const filename = this.sanitizeFilename(barcode);
    const fullPath = path.join(this.targetDirectory, filename);

    // Verificación de seguridad adicional: confirmar que la ruta resultante permanece dentro del directorio
    const resolvedPath = path.resolve(fullPath);
    const resolvedDir = path.resolve(this.targetDirectory);

    if (!resolvedPath.startsWith(resolvedDir)) {
      throw new Error('Ruta de archivo no autorizada detectada');
    }

    // Escribir archivo CSV vacío (0 bytes, sin contenido)
    fs.writeFileSync(resolvedPath, '', { encoding: 'utf-8', flag: 'w' });

    console.log(`[FileStorageService] Archivo CSV depositado con éxito: ${resolvedPath}`);

    return {
      filename,
      fullPath: resolvedPath,
      barcode,
      createdAt: new Date().toISOString()
    };
  }
}
