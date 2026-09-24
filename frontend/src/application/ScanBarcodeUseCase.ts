import type { BarcodeScan } from '../domain/models/BarcodeScan.js';
import type { ISoundService } from '../domain/ports/ISoundService.js';
import { SendBarcodeUseCase } from './SendBarcodeUseCase.js';

export class ScanBarcodeUseCase {
  private lastScannedCode: string = '';
  private lastScannedTime: number = 0;
  private readonly debounceMs = 2500; // Evita lecturas duplicadas continuas en ráfaga de la cámara

  private sendUseCase: SendBarcodeUseCase;
  private soundService: ISoundService;

  constructor(sendUseCase: SendBarcodeUseCase, soundService: ISoundService) {
    this.sendUseCase = sendUseCase;
    this.soundService = soundService;
  }

  public async processScan(
    rawCode: string,
    format: string,
    addScan: (scan: BarcodeScan) => void,
    updateScan: (id: string, updates: Partial<BarcodeScan>) => void
  ): Promise<void> {
    const code = rawCode.trim();
    if (!code) return;

    // Control de ráfaga para el mismo código de barras
    const now = Date.now();
    if (code === this.lastScannedCode && now - this.lastScannedTime < this.debounceMs) {
      return;
    }

    this.lastScannedCode = code;
    this.lastScannedTime = now;

    // 1. Feedback inmediato al operador de la tablet
    this.soundService.playSuccess();

    // 2. Registrar en el checklist de la UI como 'pending'
    const scanId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newScan: BarcodeScan = {
      id: scanId,
      code,
      format: format || 'GENERIC',
      scannedAt: new Date(),
      status: 'pending'
    };

    addScan(newScan);

    // 3. Enviar a la API del servidor Linux
    try {
      const result = await this.sendUseCase.execute(code, format);
      updateScan(scanId, {
        status: 'sent',
        filename: result.filename
      });
    } catch (error: any) {
      this.soundService.playError();
      updateScan(scanId, {
        status: 'error',
        errorMessage: error.message || 'Error al conectar con la API'
      });
    }
  }

  public async retryScan(
    scan: BarcodeScan,
    updateScan: (id: string, updates: Partial<BarcodeScan>) => void
  ): Promise<void> {
    updateScan(scan.id, { status: 'pending', errorMessage: undefined });

    try {
      const result = await this.sendUseCase.execute(scan.code, scan.format);
      this.soundService.playSuccess();
      updateScan(scan.id, {
        status: 'sent',
        filename: result.filename
      });
    } catch (error: any) {
      this.soundService.playError();
      updateScan(scan.id, {
        status: 'error',
        errorMessage: error.message || 'Error al reintentar envío'
      });
    }
  }
}
