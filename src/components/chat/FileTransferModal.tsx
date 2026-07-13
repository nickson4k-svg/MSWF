import { useEffect, useState } from 'react';
import { formatBytes } from '@/lib/webrtc';
import { Button } from '@/components/ui/button';
import { FileDown, X, Check } from 'lucide-react';

export const FileTransferModal = ({
  senderName,
  fileName,
  fileSize,
  onAccept,
  onReject
}: {
  senderName: string;
  fileName: string;
  fileSize: number;
  onAccept: () => void;
  onReject: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds to accept

  useEffect(() => {
    if (timeLeft <= 0) {
      onReject();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onReject]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center">
            <FileDown className="w-8 h-8" />
          </div>
          
          <h2 className="text-lg font-bold text-zinc-100">Вхідний файл</h2>
          
          <p className="text-zinc-400 text-sm">
            <span className="text-zinc-200 font-semibold">{senderName}</span> хоче надіслати вам файл безпосередньо (P2P):
          </p>

          <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 flex items-center justify-between text-left">
            <span className="text-zinc-200 font-medium text-sm truncate max-w-[200px]" title={fileName}>
              {fileName}
            </span>
            <span className="text-xs text-zinc-500 whitespace-nowrap ml-2">
              {formatBytes(fileSize)}
            </span>
          </div>

          <div className="text-xs text-zinc-500 font-medium">
            Автоматичне скасування через {timeLeft}с
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 border-zinc-700 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
              onClick={onReject}
            >
              <X className="w-4 h-4 mr-2" />
              Відхилити
            </Button>
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
              onClick={onAccept}
            >
              <Check className="w-4 h-4 mr-2" />
              Прийняти
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
