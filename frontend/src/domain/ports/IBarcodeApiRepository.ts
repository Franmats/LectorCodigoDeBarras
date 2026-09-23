export interface SendBarcodeResult {
  success: boolean;
  filename?: string;
  message: string;
  destinationDirectory?: string;
}

export interface IBarcodeApiRepository {
  sendBarcode(code: string, format?: string): Promise<SendBarcodeResult>;
}
