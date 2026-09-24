import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Flashlight, FlashlightOff, VideoOff, AlertTriangle, ScanLine } from 'lucide-react';
import { useBarcodeStore } from '../store/useBarcodeStore.js';
import './ScannerView.css';

const SCANNER_ELEMENT_ID = 'barcode-scanner-viewport';

// Formatos de código de barras habituales en logística/retail + QR por si acaso
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E
];

// Después de este tiempo sin ninguna lectura exitosa, empezamos a intentar
// leer los números impresos debajo del código de barras (fallback por OCR).
const OCR_TRIGGER_DELAY_MS = 4000;
// Cada cuánto reintentamos el OCR mientras seguimos sin poder leer nada.
const OCR_RETRY_INTERVAL_MS = 3000;
// Si pasa este tiempo sin ninguna lectura (ni de cámara ni de OCR), apagamos
// la cámara sola para no gastar batería/datos innecesariamente.
const IDLE_SHUTOFF_MS = 120000;
// Mínimo de dígitos seguidos para aceptar un resultado de OCR como válido.
const MIN_OCR_DIGITS = 6;

type OcrStatus = 'idle' | 'running' | 'unsupported';

export function ScannerView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchError, setTorchError] = useState(false);
  const [isRefocusing, setIsRefocusing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');

  const isCameraActive = useBarcodeStore((s) => s.isCameraActive);
  const cameraOffReason = useBarcodeStore((s) => s.cameraOffReason);
  const torchEnabled = useBarcodeStore((s) => s.torchEnabled);
  const setTorchEnabled = useBarcodeStore((s) => s.setTorchEnabled);
  const setIsCameraActive = useBarcodeStore((s) => s.setIsCameraActive);
  const handleCodeScanned = useBarcodeStore((s) => s.handleCodeScanned);

  // Se actualiza en cada lectura exitosa (cámara u OCR). Vive en un ref porque
  // lo leen intervalos que no deben re-crearse en cada render.
  const lastSuccessAtRef = useRef<number>(Date.now());
  const ocrRunningRef = useRef(false);
  const ocrUnsupportedRef = useRef(false);
  const ocrWorkerRef = useRef<any>(null);

  // El worker de OCR se crea una sola vez, la primera vez que hace falta, y
  // se mantiene vivo mientras el componente esté montado (crearlo de nuevo en
  // cada pausa/reanudación de cámara sería muy costoso).
  useEffect(() => {
    return () => {
      ocrWorkerRef.current?.terminate?.().catch(() => { });
      ocrWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isCameraActive) {
      return;
    }

    lastSuccessAtRef.current = Date.now();
    ocrUnsupportedRef.current = false;
    setOcrStatus('idle');

    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false
    });
    scannerRef.current = scanner;

    // Apaga la cámara de forma segura, sin importar en qué estado haya
    // quedado html5-qrcode (algunas versiones lanzan una excepción
    // SINCRÓNICA -no una promesa rechazada- si stop() se llama cuando
    // todavía no terminó de arrancar).
    const safeShutdown = (instance: Html5Qrcode) => {
      try {
        const state = instance.getState();
        const isActive =
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED;
        if (!isActive) {
          return;
        }
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {
            // Ya se detuvo o el elemento fue desmontado; no hay nada más que hacer.
          });
      } catch {
        // getState()/stop() lanzaron de forma sincrónica: la cámara ya
        // no estaba corriendo, así que no hace falta hacer nada.
      }
    };

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
            return { width: size, height: Math.floor(size * 0.55) };
          },
          aspectRatio: 1.777,
          disableFlip: false
        },
        (decodedText, decodedResult) => {
          const format =
            decodedResult?.result?.format?.formatName ?? 'DESCONOCIDO';
          lastSuccessAtRef.current = Date.now();
          setOcrStatus('idle');
          void handleCodeScanned(decodedText, format);
        },
        () => {
          // Callback de "no encontrado en este frame": se dispara constantemente
          // mientras la cámara busca un código, así que se ignora a propósito.
        }
      )
      .then(() => {
        if (cancelled) {
          // El componente ya se desmontó (típico del doble-render de
          // StrictMode en desarrollo) mientras la cámara arrancaba:
          // apagarla ahora que sabemos que sí llegó a iniciar.
          safeShutdown(scanner);
          return;
        }
        setCameraError(null);
        try {
          const capabilities = scanner.getRunningTrackCapabilities();
          setTorchSupported(Boolean((capabilities as any)?.torch));
        } catch {
          setTorchSupported(false);
        }
        // El foco continuo se aplica DESPUÉS de que la cámara ya está
        // funcionando y solo si el dispositivo lo soporta; si el navegador
        // no lo soporta, esto simplemente falla en silencio y la cámara
        // sigue andando con el foco por defecto.
        scanner
          .applyVideoConstraints({ advanced: [{ focusMode: 'continuous' } as any] })
          .catch(() => { });
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err?.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador.'
            : err?.name === 'NotFoundError'
              ? 'No se encontró ninguna cámara en este dispositivo.'
              : 'No se pudo iniciar la cámara.';
        setCameraError(message);
      });

    // --- Fallback OCR: si hace rato que no se lee ningún código, intenta
    // reconocer los números impresos debajo del código de barras.
    const attemptOcrFallback = async () => {
      if (cancelled || ocrRunningRef.current) return;
      const idleFor = Date.now() - lastSuccessAtRef.current;
      if (idleFor < OCR_TRIGGER_DELAY_MS) return;
      if (ocrUnsupportedRef.current) return;

      const video = containerRef.current?.querySelector('video');
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      ocrRunningRef.current = true;
      setOcrStatus('running');
      try {
        if (!ocrWorkerRef.current) {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng', 1, { logger: () => { } });
          await worker.setParameters({
            tessedit_char_whitelist: '0123456789',
            tessedit_pageseg_mode: '7' as any // línea única de texto
          });
          ocrWorkerRef.current = worker;
        }
        if (cancelled) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const { data } = await ocrWorkerRef.current.recognize(canvas);
        const digitsOnly = (data.text.match(/\d+/g) || []).join('');

        if (!cancelled && digitsOnly.length >= MIN_OCR_DIGITS) {
          lastSuccessAtRef.current = Date.now();
          void handleCodeScanned(digitsOnly, 'OCR_NUMEROS');
        }
      } catch {
        ocrUnsupportedRef.current = true;
        setOcrStatus('unsupported');
      } finally {
        ocrRunningRef.current = false;
        if (!cancelled && !ocrUnsupportedRef.current) setOcrStatus('idle');
      }
    };

    const ocrInterval = setInterval(attemptOcrFallback, OCR_RETRY_INTERVAL_MS);

    // --- Apagado automático por inactividad: si pasa mucho tiempo sin leer
    // nada (ni cámara ni OCR), apaga la cámara. El usuario la vuelve a
    // encender tocando el botón del header.
    const idleInterval = setInterval(() => {
      if (Date.now() - lastSuccessAtRef.current > IDLE_SHUTOFF_MS) {
        setIsCameraActive(false, 'idle');
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(ocrInterval);
      clearInterval(idleInterval);
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) {
        safeShutdown(current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive, handleCodeScanned, setIsCameraActive]);

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    const next = !torchEnabled;
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: next } as any]
      });
      setTorchEnabled(next);
      setTorchError(false);
    } catch {
      // Algunos navegadores/dispositivos no soportan el control de linterna.
      setTorchError(true);
      window.setTimeout(() => setTorchError(false), 2500);
    }
  };

  // Truco para forzar un re-enfoque: alternar brevemente el modo de foco.
  // Sirve en varios navegadores Android donde la cámara se "queda pegada"
  // enfocando lejos y no reacciona sola al acercar el código.
  const handleTapToRefocus = async () => {
    const scanner = scannerRef.current;
    if (!scanner || isRefocusing) return;
    setIsRefocusing(true);
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ focusMode: 'manual' } as any]
      });
      await new Promise((resolve) => setTimeout(resolve, 120));
      await scanner.applyVideoConstraints({
        advanced: [{ focusMode: 'continuous' } as any]
      });
    } catch {
      // Si el navegador no soporta control manual de foco, no hay nada que hacer.
    } finally {
      window.setTimeout(() => setIsRefocusing(false), 500);
    }
  };

  return (
    <div className="scanner-view">
      <div className="scanner-frame" onClick={handleTapToRefocus} role="presentation">
        <div id={SCANNER_ELEMENT_ID} ref={containerRef} className="scanner-viewport" />

        {!cameraError && <div className="scanner-laser" aria-hidden="true" />}

        {isRefocusing && (
          <div className="scanner-focus-ring" aria-hidden="true">
            <ScanLine size={28} />
          </div>
        )}

        {cameraError && (
          <div className="scanner-overlay scanner-overlay--error">
            <AlertTriangle size={32} />
            <p>{cameraError}</p>
          </div>
        )}

        {!isCameraActive && !cameraError && (
          <div className="scanner-overlay">
            <VideoOff size={32} />
            <p>
              {cameraOffReason === 'idle' ? 'Cámara apagada por inactividad' : 'Cámara en pausa'}
            </p>
            <span className="scanner-overlay__hint">Tocá el botón de la cámara para reactivarla</span>
          </div>
        )}
      </div>

      <div className="scanner-controls">
        <button
          type="button"
          className={`torch-button ${torchEnabled ? 'torch-button--on' : ''}`}
          onClick={toggleTorch}
          disabled={!isCameraActive}
          aria-pressed={torchEnabled}
        >
          {torchEnabled ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
          {torchEnabled ? 'Linterna encendida' : 'Linterna'}
        </button>

        {torchError && <span className="scanner-hint scanner-hint--error">Este dispositivo no permite controlar la linterna</span>}
        {!torchSupported && !torchError && isCameraActive && (
          <span className="scanner-hint">La linterna no está disponible en esta cámara</span>
        )}
        {ocrStatus === 'running' && (
          <span className="scanner-hint scanner-hint--ocr">Intentando leer los números del código…</span>
        )}
      </div>
    </div>
  );
}