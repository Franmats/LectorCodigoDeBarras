import { create } from 'zustand';
import type { BarcodeScan } from '../../domain/models/BarcodeScan.js';
import { BarcodeHttpRepository } from '../../infrastructure/api/BarcodeHttpRepository.js';
import { WebAudioFeedbackService } from '../../infrastructure/sound/WebAudioFeedbackService.js';
import { SendBarcodeUseCase } from '../../application/SendBarcodeUseCase.js';
import { ScanBarcodeUseCase } from '../../application/ScanBarcodeUseCase.js';

// Inyección de dependencias (Clean Architecture)
const apiRepository = new BarcodeHttpRepository();
const soundService = new WebAudioFeedbackService();
const sendUseCase = new SendBarcodeUseCase(apiRepository);
const scanUseCase = new ScanBarcodeUseCase(sendUseCase, soundService);

interface BarcodeState {
  scans: BarcodeScan[];
  isCameraActive: boolean;
  torchEnabled: boolean;
  apiUrl: string;

  // Acciones en memoria
  addScan: (scan: BarcodeScan) => void;
  updateScan: (id: string, updates: Partial<BarcodeScan>) => void;
  clearScans: () => void;
  setIsCameraActive: (active: boolean) => void;
  setTorchEnabled: (enabled: boolean) => void;

  // Operaciones de negocio
  handleCodeScanned: (code: string, format?: string) => Promise<void>;
  handleRetryScan: (scan: BarcodeScan) => Promise<void>;
  handleRetryAllFailed: () => Promise<void>;
}

export const useBarcodeStore = create<BarcodeState>((set, get) => ({
  scans: [],
  isCameraActive: true,
  torchEnabled: false,
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',

  addScan: (scan) =>
    set((state) => ({
      // Los escaneos más recientes van primero en el checklist
      scans: [scan, ...state.scans]
    })),

  updateScan: (id, updates) =>
    set((state) => ({
      scans: state.scans.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    })),

  clearScans: () => set({ scans: [] }),

  setIsCameraActive: (active) => set({ isCameraActive: active }),

  setTorchEnabled: (enabled) => set({ torchEnabled: enabled }),

  handleCodeScanned: async (code: string, format: string = 'UNKNOWN') => {
    const { addScan, updateScan } = get();
    await scanUseCase.processScan(code, format, addScan, updateScan);
  },

  handleRetryScan: async (scan: BarcodeScan) => {
    const { updateScan } = get();
    await scanUseCase.retryScan(scan, updateScan);
  },

  handleRetryAllFailed: async () => {
    const { scans, handleRetryScan } = get();
    const failedScans = scans.filter((s) => s.status === 'error');
    for (const scan of failedScans) {
      await handleRetryScan(scan);
    }
  }
}));
