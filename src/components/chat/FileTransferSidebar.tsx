import { useRef, useSyncExternalStore, memo } from 'react';
import { FileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferItem } from './FileTransferItem';
import { Plus, Download, File, Image as ImageIcon, FileText, Film, Music, Box, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GemSmoke } from '@paper-design/shaders-react';
import { formatBytes } from '@/lib/webrtc';
import { format } from 'date-fns';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export interface RoomFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sender: string;
  timestamp: number;
  downloadData?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  if (mimeType.startsWith('video/')) return <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Box className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />;
};

export const FileTransferSidebar = memo(function FileTransferSidebar({
  transfers,
  roomFiles = [],
  onSendFile,
  onCancelTransfer,
  isFriendOnline,
  onScrollToMessage
}: {
  transfers: FileTransfer[];
  roomFiles?: RoomFileItem[];
  onSendFile: (file: File) => void;
  onCancelTransfer: (id: string) => void;
  isFriendOnline: boolean;
  onScrollToMessage?: (msgId: string) => void;
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

  const totalItemCount = transfers.length + roomFiles.length;

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
            <span>Файли та P2P</span>
            {hasActiveTransfers ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ) : totalItemCount > 0 ? (
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full border border-zinc-700">{totalItemCount}</span>
            ) : null}
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium">Історія передач кімнати</p>
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

      <div className="flex-1 p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {totalItemCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <p className="text-xs font-medium">Історія передач порожня</p>
            <p className="text-[10px] text-zinc-600 mt-1">Натисніть &quot;Надіслати&quot; або перетягніть файл у чат</p>
          </div>
        ) : (
          <>
            {/* Active P2P Transfers */}
            {transfers.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 px-1">
                  Активні передачі ({transfers.length})
                </span>
                {transfers.map(t => (
                  <FileTransferItem 
                    key={t.id} 
                    transfer={t} 
                    onCancel={onCancelTransfer} 
                  />
                ))}
              </div>
            )}

            {/* Room File History */}
            {roomFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
                  Історія файлів ({roomFiles.length})
                </span>
                {roomFiles.map(file => (
                  <div 
                    key={file.id}
                    className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2.5 hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {getFileIcon(file.mimeType)}
                      <div className="min-w-0 flex-1">
                        <p className="text-zinc-200 font-medium text-xs truncate" title={file.fileName}>
                          {file.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                          <span>{formatBytes(file.fileSize)}</span>
                          <span>•</span>
                          <span className="truncate max-w-[70px]">{file.sender}</span>
                          <span>•</span>
                          <span>{format(new Date(file.timestamp), 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {file.downloadData ? (
                        <a 
                          href={file.downloadData} 
                          download={file.fileName}
                          className="p-1.5 rounded-lg hover:bg-zinc-700/80 text-zinc-400 hover:text-emerald-400 transition-colors"
                          title="Завантажити"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      ) : onScrollToMessage ? (
                        <button
                          onClick={() => onScrollToMessage(file.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-700/80 text-zinc-400 hover:text-blue-400 transition-colors"
                          title="Перейти до повідомлення"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
