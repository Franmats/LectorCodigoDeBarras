import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FileStorageService } from '../services/file-storage.service.js';

const barcodeSchema = z.object({
  barcode: z.string().trim().min(1, 'El código de barras es requerido').max(255, 'Código de barras demasiado largo'),
  format: z.string().optional()
});

export class BarcodeController {
  private fileStorageService: FileStorageService;

  constructor(fileStorageService?: FileStorageService) {
    this.fileStorageService = fileStorageService || new FileStorageService();
  }

  public handleScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = barcodeSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: validation.error.errors.map(err => err.message)
        });
        return;
      }

      const { barcode, format } = validation.data;
      const fileResult = this.fileStorageService.createEmptyCsv(barcode);

      res.status(201).json({
        success: true,
        message: 'Archivo CSV creado exitosamente en el servidor',
        data: {
          barcode,
          format: format || 'UNKNOWN',
          filename: fileResult.filename,
          destinationDirectory: process.env.NODE_ENV === 'production' ? undefined : fileResult.fullPath,
          createdAt: fileResult.createdAt
        }
      });
    } catch (error: any) {
      console.error('[BarcodeController] Error al procesar código de barras:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno al depositar archivo CSV'
      });
    }
  };
}
