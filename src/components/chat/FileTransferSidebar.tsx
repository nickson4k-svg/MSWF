import { useRef, useState, useEffect } from 'react';
import { FileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferItem } from './FileTransferItem';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GemSmoke } from '@paper-design/shaders-react';

export const FileTransferSidebar = ({
  transfers,
  onSendFile,
  onCancelTransfer,
  isFriendOnline
}: {
  transfers: FileTransfer[];
  onSendFile: (file: File) => void;
  onCancelTransfer: (id: string) => void;
  isFriendOnline: boolean;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const hasActiveTransfers = transfers.some(t => t.status === 'transferring' || t.status === 'connecting');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSendFile(e.target.files[0]);
      e.target.value = ''; // Reset
    }
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden flex flex-col h-full relative">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center relative overflow-hidden">
        {/* GemSmoke Shader header background when active transfers occur */}
        {mounted && hasActiveTransfers && (
          <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
            <GemSmoke
              width="100%"
              height="100%"
              colors={["#2fb64c", "#cdff61", "#ffffff", "#0aff78"]}
              colorBack="#000000"
              colorInner="#000000"
              shape="diamond"
              innerDistortion={1}
              outerDistortion={0.8}
              outerGlow={0}
              innerGlow={1}
              offset={0}
              angle={0}
              size={0.8}
              speed={1}
              scale={0.6}
              fit="cover"
            />
          </div>
        )}

        <h3 className="text-zinc-100 font-semibold flex items-center gap-2 text-sm z-10">
          Файли
          {hasActiveTransfers && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </h3>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-7 h-7 rounded-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isFriendOnline}
          title={!isFriendOnline ? 'Друг офлайн' : 'Відправити файл'}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect}
        />
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-2 relative">
        {transfers.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs">
            {isFriendOnline 
              ? "Перетягніть файл у чат або натисніть '+' для швидкої передачі напряму."
              : "P2P передача працює лише коли друг онлайн."
            }
          </div>
        ) : (
          transfers.map(transfer => (
            <FileTransferItem 
              key={transfer.id} 
              transfer={transfer} 
              onCancel={onCancelTransfer} 
            />
          ))
        )}
      </div>
    </div>
  );
};
