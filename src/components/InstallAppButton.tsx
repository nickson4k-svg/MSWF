'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if it's already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('Щоб встановити додаток на iPhone: Натисніть кнопку "Поділитися" (квадрат зі стрілкою) внизу екрана та виберіть "На початковий екран" (Add to Home Screen).');
      return;
    }
    if (!deferredPrompt) {
      alert('Додаток вже встановлено або ваш браузер не підтримує швидке встановлення.');
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Do not show button if already installed
  if (isStandalone) return null;
  // If not iOS and no prompt available, don't show the button (maybe not supported)
  if (!isIOS && !deferredPrompt) return null;

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleInstallClick} 
      className="absolute top-4 left-4 text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 bg-zinc-950/50 backdrop-blur-md transition-all shadow-lg shadow-emerald-500/10"
    >
      <Download className="w-4 h-4 mr-2" />
      Скачати додаток
    </Button>
  );
}
