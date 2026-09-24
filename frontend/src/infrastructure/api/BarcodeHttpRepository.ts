import type { IBarcodeApiRepository, SendBarcodeResult } from '../../domain/ports/IBarcodeApiRepository.js';

export class BarcodeHttpRepository implements IBarcodeApiRepository {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Si no se define VITE_API_URL, se usa por defecto la API local
    const rawUrl = baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:4000/api/';
    // Remover barra final si existe
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  public async sendBarcode(code: string, format: string = 'UNKNOWN'): Promise<SendBarcodeResult> {
    const endpoint = `${this.baseUrl}/barcodes`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          barcode: code,
          format: format
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.message || `Error del servidor (${response.status} ${response.statusText})`;
        throw new Error(errorMsg);
      }

      return {
        success: true,
        filename: data?.data?.filename || `${code}.csv`,
        message: data?.message || 'Archivo depositado en el servidor',
        destinationDirectory: data?.data?.destinationDirectory
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al conectar con el servidor');
      }

      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error(`No se pudo conectar con el servidor (${this.baseUrl}). Verifica la conexión o la configuración de CORS.`);
      }

      throw new Error(err.message || 'Error desconocido al enviar el código');
    }
  }
}
