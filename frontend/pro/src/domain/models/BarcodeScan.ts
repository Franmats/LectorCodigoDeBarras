export type ScanStatus = 'pending' | 'sent' | 'error';

export interface BarcodeScan {
  id: string;
  code: string;
  format: string;
  scannedAt: Date;
  status: ScanStatus;
  errorMessage?: string;
  filename?: string;
}
