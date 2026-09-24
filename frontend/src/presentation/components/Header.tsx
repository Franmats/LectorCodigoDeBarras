import { ScanBarcode, Video, VideoOff } from 'lucide-react';
import { useBarcodeStore } from '../store/useBarcodeStore.js';
import './Header.css';
import { InstallButton } from './InstallButton';

export function Header() {
  const scans = useBarcodeStore((s) => s.scans);
  const isCameraActive = useBarcodeStore((s) => s.isCameraActive);
  const cameraOffReason = useBarcodeStore((s) => s.cameraOffReason);
  const setIsCameraActive = useBarcodeStore((s) => s.setIsCameraActive);

  const sentCount = scans.filter((s) => s.status === 'sent').length;
  const errorCount = scans.filter((s) => s.status === 'error').length;
  const pendingCount = scans.filter((s) => s.status === 'pending').length;

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <ScanBarcode size={22} />
        <span>Lector de Códigos</span>
      </div>

      <div className="app-header__stats">
        <span className="stat stat--sent">{sentCount} enviados</span>
        {pendingCount > 0 && <span className="stat stat--pending">{pendingCount} en curso</span>}
        {errorCount > 0 && <span className="stat stat--error">{errorCount} con error</span>}
        {!isCameraActive && cameraOffReason === 'idle' && (
          <span className="stat stat--pending">cámara apagada por inactividad</span>
        )}

      </div>
      <InstallButton />
      <button
        type="button"
        className="app-header__camera-toggle"
        onClick={() => setIsCameraActive(!isCameraActive, 'manual')}
        aria-pressed={isCameraActive}
        aria-label={isCameraActive ? 'Pausar cámara' : 'Reanudar cámara'}
      >
        {isCameraActive ? <Video size={18} /> : <VideoOff size={18} />}
      </button>
    </header>
  );
}