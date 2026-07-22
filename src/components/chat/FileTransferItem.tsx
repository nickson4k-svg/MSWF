import { useSyncExternalStore } from 'react';
import { FileTransfer } from '@/hooks/useFileTransfer';
import { formatBytes } from '@/lib/webrtc';
import { X, Download, File, Image as ImageIcon, FileText, Film, Music, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GemSmoke } from '@paper-design/shaders-react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-400" />;
  if (mimeType.startsWith('video/')) return <Film className="w-5 h-5 text-purple-400" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-emerald-400" />;
  if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText className="w-5 h-5 text-orange-400" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Box className="w-5 h-5 text-amber-600" />;
  return <File className="w-5 h-5 text-zinc-400" />;
};

export const FileTransferItem = ({ 
  transfer, 
  onCancel 
}: { 
  transfer: FileTransfer, 
  onCancel: (id: string) => void 
}) => {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isCompleted = transfer.status === 'completed';
  const isError = transfer.status === 'error' || transfer.status === 'rejected';
  const isTransferring = transfer.status === 'transferring' || transfer.status === 'connecting';

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 group relative overflow-hidden">
      {/* GemSmoke Shader Background during active transfer */}
      {mounted && isTransferring && (
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none overflow-hidden rounded-xl">
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

      {/* Progress background */}
      {transfer.status === 'transferring' && (
        <div 
          className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 transition-all duration-300 z-0"
          style={{ width: `${transfer.progress}%` }}
        />
      )}
      
      <div className="flex items-center gap-3 relative z-10 w-full overflow-hidden">
        {getFileIcon(transfer.fileMeta.mimeType)}
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-zinc-200 font-medium text-sm truncate" title={transfer.fileMeta.fileName}>
            {transfer.fileMeta.fileName}
          </p>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-zinc-500">
              {formatBytes(transfer.fileMeta.fileSize)}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 
              isError ? 'bg-red-500/20 text-red-400' : 
              'bg-blue-500/20 text-blue-400'
            }`}>
              {transfer.status === 'connecting' && 'Підключення...'}
              {transfer.status === 'transferring' && `${transfer.progress}%`}
              {isCompleted && 'Збережено'}
              {transfer.status === 'rejected' && 'Відхилено'}
              {transfer.status === 'error' && 'Помилка'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 relative z-10">
        {(transfer.status === 'connecting' || transfer.status === 'transferring') && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-7 h-7 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => onCancel(transfer.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        {isCompleted && transfer.blobUrl && (
          <a 
            href={transfer.blobUrl} 
            download={transfer.fileMeta.fileName}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};
