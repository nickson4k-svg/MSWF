import { useRef, useSyncExternalStore, memo } from 'react';
import { FileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferItem } from './FileTransferItem';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GemSmoke } from '@paper-design/shaders-react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const FileTransferSidebar = memo(function FileTransferSidebar({
  transfers,
  onSendFile,
  onCancelTransfer,
  isFriendOnline
}: {
  transfers: FileTransfer[];
  onSendFile: (file: File) => void;
  onCancelTransfer: (id: string) => void;
  isFriendOnline: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hasActiveTransfers = transfers.some(t => t.status === 'transferring' || t.status === 'connecting');

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
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
            <GemSmoke
              width="100%"
              height="100%"
              colors={["#2fb64c", "#cdff61", "#ffffff", "#0aff78"]}
              colorBack="#09090b"
              colorInner="#09090b"
              shape="none"
              innerDistortion={0.7}
              outerDistortion={0.7}
              outerGlow={1}
              innerGlow={1}
              offset={0}
              angle={45}
              size={0.9}
              speed={1}
              scale={2.2}
              fit="cover"
            />
          </div>
        )}

        <div className="relative z-10">
          <h2 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
            <span>P2P Файли</span>
            {hasActiveTransfers && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium">Пряма передача між браузерами</p>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect} 
        />

        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs gap-1 shadow-lg shadow-emerald-950/40 relative z-10 border border-emerald-500/30"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isFriendOnline}
          title={isFriendOnline ? "Надіслати файл" : "Співрозмовник офлайн"}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Надіслати</span>
        </Button>
      </div>

      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {transfers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <p className="text-xs">Історія передач порожня</p>
            <p className="text-[10px] text-zinc-600 mt-1">Натисніть &quot;Надіслати&quot; або перетягніть файл у чат</p>
          </div>
        ) : (
          transfers.map(t => (
            <FileTransferItem 
              key={t.id} 
              transfer={t} 
              onCancel={onCancelTransfer} 
            />
          ))
        )}
      </div>
    </div>
  );
});
