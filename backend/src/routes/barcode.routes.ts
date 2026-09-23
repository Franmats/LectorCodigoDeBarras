import { Router } from 'express';
import { BarcodeController } from '../controllers/barcode.controller.js';

const router = Router();
const barcodeController = new BarcodeController();

// Ruta principal requerida: recibe el código de barras y genera el CSV vacío
router.post('/barcodes', barcodeController.handleScan);

// Ruta de health check para monitoreo en Linux / balanceadores
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'barcode-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
