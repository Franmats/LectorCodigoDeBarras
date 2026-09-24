import { useEffect, useState } from 'react';

// El evento 'beforeinstallprompt' es específico de navegadores basados en
// Chromium (Chrome/Edge/Android WebView) y todavía no forma parte de los
// tipos estándar del DOM, así que lo tipamos nosotros.
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isRunningStandalone(): boolean {
    const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // iOS/Safari no soporta matchMedia display-mode ni beforeinstallprompt,
    // pero expone este flag cuando la app ya fue agregada a la pantalla de inicio.
    const iosStandalone = (window.navigator as any).standalone === true;
    return displayModeStandalone || iosStandalone;
}

export function usePwaInstallPrompt() {
    const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(isRunningStandalone());

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            // Evita que Chrome muestre su propio mini-banner automático; lo
            // disparamos nosotros desde el botón de la app.
            event.preventDefault();
            setInstallEvent(event as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setInstallEvent(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!installEvent) return;
        await installEvent.prompt();
        const { outcome } = await installEvent.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        // El evento solo se puede usar una vez.
        setInstallEvent(null);
    };

    return {
        // Solo mostramos el botón si el navegador ofreció instalar y todavía no está instalada.
        canInstall: Boolean(installEvent) && !isInstalled,
        isInstalled,
        promptInstall
    };
}