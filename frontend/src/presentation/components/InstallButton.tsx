import { Download } from 'lucide-react';
import { usePwaInstallPrompt } from '../hooks/usePwaInstallPrompt';
import './InstallButton.css';

export function InstallButton() {
    const { canInstall, promptInstall } = usePwaInstallPrompt();

    if (!canInstall) return null;

    return (
        <button type="button" className="install-button" onClick={() => void promptInstall()}>
            <Download size={16} />
            Instalar app
        </button>
    );
}