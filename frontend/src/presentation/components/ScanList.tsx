import { CheckCircle2, Clock, XCircle, RotateCcw, Trash2, RefreshCw } from 'lucide-react';
import type { BarcodeScan } from '../../domain/models/BarcodeScan.js';
import { useBarcodeStore } from '../store/useBarcodeStore.js';
import './ScanList.css';

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function StatusIcon({ status }: { status: BarcodeScan['status'] }) {
  switch (status) {
    case 'sent':
      return <CheckCircle2 size={20} className="status-icon status-icon--sent" />;
    case 'error':
      return <XCircle size={20} className="status-icon status-icon--error" />;
    default:
      return <Clock size={20} className="status-icon status-icon--pending" />;
  }
}

function ScanRow({ scan }: { scan: BarcodeScan }) {
  const handleRetryScan = useBarcodeStore((s) => s.handleRetryScan);

  return (
    <li className={`scan-row scan-row--${scan.status}`}>
      <StatusIcon status={scan.status} />

      <div className="scan-row__info">
        <span className="scan-row__code">{scan.code}</span>
        <span className="scan-row__meta">
          {scan.format} · {formatTime(scan.scannedAt)}
          {scan.filename ? ` · ${scan.filename}` : ''}
        </span>
        {scan.status === 'error' && scan.errorMessage && (
          <span className="scan-row__error">{scan.errorMessage}</span>
        )}
      </div>

      {scan.status === 'error' && (
        <button
          type="button"
          className="scan-row__retry"
          onClick={() => void handleRetryScan(scan)}
          aria-label="Reintentar envío"
        >
          <RotateCcw size={16} />
        </button>
      )}
    </li>
  );
}

export function ScanList() {
  const scans = useBarcodeStore((s) => s.scans);
  const clearScans = useBarcodeStore((s) => s.clearScans);
  const handleRetryAllFailed = useBarcodeStore((s) => s.handleRetryAllFailed);

  const failedCount = scans.filter((s) => s.status === 'error').length;

  if (scans.length === 0) {
    return (
      <div className="scan-list scan-list--empty">
        <p>Todavía no escaneaste ningún código.</p>
        <p className="scan-list__hint">Apuntá la cámara a un código de barras para empezar.</p>
      </div>
    );
  }

  return (
    <div className="scan-list">
      <div className="scan-list__toolbar">
        <span className="scan-list__count">{scans.length} escaneado{scans.length === 1 ? '' : 's'}</span>
        <div className="scan-list__actions">
          {failedCount > 0 && (
            <button
              type="button"
              className="scan-list__action scan-list__action--retry"
              onClick={() => void handleRetryAllFailed()}
            >
              <RefreshCw size={14} />
              Reintentar {failedCount}
            </button>
          )}
          <button type="button" className="scan-list__action" onClick={clearScans}>
            <Trash2 size={14} />
            Limpiar
          </button>
        </div>
      </div>

      <ul className="scan-list__items">
        {scans.map((scan) => (
          <ScanRow key={scan.id} scan={scan} />
        ))}
      </ul>
    </div>
  );
}
