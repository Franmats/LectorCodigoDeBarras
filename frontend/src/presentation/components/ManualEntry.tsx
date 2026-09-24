import { useRef, useState, type FormEvent } from 'react';
import { Keyboard, Send, X } from 'lucide-react';
import { useBarcodeStore } from '../store/useBarcodeStore.js';
import './ManualEntry.css';

export function ManualEntry() {
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const handleCodeScanned = useBarcodeStore((s) => s.handleCodeScanned);

    const openPanel = () => {
        setIsOpen(true);
        // Espera a que el input exista en el DOM antes de enfocarlo.
        window.setTimeout(() => inputRef.current?.focus(), 50);
    };

    const closePanel = () => {
        setIsOpen(false);
        setValue('');
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const code = value.trim();
        if (!code) return;
        void handleCodeScanned(code, 'MANUAL');
        setValue('');
        inputRef.current?.focus();
    };

    if (!isOpen) {
        return (
            <button type="button" className="manual-entry-toggle" onClick={openPanel}>
                <Keyboard size={16} />
                Ingresar código manualmente
            </button>
        );
    }

    return (
        <form className="manual-entry-panel" onSubmit={handleSubmit}>
            <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="Escribí o pegá el código..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="manual-entry-input"
            />
            <button
                type="submit"
                className="manual-entry-submit"
                aria-label="Enviar código"
                disabled={!value.trim()}
            >
                <Send size={16} />
            </button>
            <button
                type="button"
                className="manual-entry-close"
                onClick={closePanel}
                aria-label="Cerrar entrada manual"
            >
                <X size={16} />
            </button>
        </form>
    );
}