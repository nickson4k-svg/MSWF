import { formatBytes } from '@/lib/webrtc';
import { Download, Image as ImageIcon, Film, Music, FileText, Box, File, Play } from 'lucide-react';
import { useState } from 'react';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-400" />;
  if (mimeType.startsWith('video/')) return <Film className="w-5 h-5 text-purple-400" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-emerald-400" />;
  if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText className="w-5 h-5 text-orange-400" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Box className="w-5 h-5 text-amber-500" />;
  return <File className="w-5 h-5 text-zinc-400" />;
};

export const FileMessage = ({
  fileName,
  fileSize,
  mimeType = '',
  blobUrl,
  isMe,
  onMediaClick,
}: {
  fileName: string;
  fileSize: number;
  mimeType?: string;
  blobUrl?: string;
  isMe?: boolean;
  onMediaClick?: (url: string, type: 'image' | 'video', fileName: string) => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const isImageMime = mimeType.startsWith('image/');
  const isVideoMime = mimeType.startsWith('video/');
  const isAudioMime = mimeType.startsWith('audio/');

  // Image preview (Telegram Style)
  if (isImageMime) {
    return (
      <div 
        className={`group relative overflow-hidden rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} max-w-[280px] sm:max-w-[340px] ${blobUrl ? 'cursor-pointer' : ''} shadow-lg hover:shadow-2xl transition-all border border-zinc-800/50 bg-zinc-950`}
        onClick={() => blobUrl && onMediaClick && onMediaClick(blobUrl, 'image', fileName)}
      >
        {blobUrl && !imageError ? (
          <img
            src={blobUrl}
            alt={fileName}
            className="w-full max-h-[320px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-44 bg-zinc-900/90 flex flex-col items-center justify-center p-4 text-center">
            <ImageIcon className="w-10 h-10 text-blue-400 mb-2 animate-pulse" />
            <span className="text-xs text-zinc-300 font-medium truncate max-w-[220px]">{fileName}</span>
            <span className="text-[10px] text-zinc-500 mt-1">{formatBytes(fileSize)}</span>
          </div>
        )}
        
        {/* Telegram Gradient Overlay with file info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-white text-xs font-semibold truncate" title={fileName}>{fileName}</span>
            <span className="text-zinc-300 text-[10px] font-medium">{formatBytes(fileSize)}</span>
          </div>
          {blobUrl && (
            <a
              href={blobUrl}
              download={fileName}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-colors flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
              title="Завантажити"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // Video preview (Telegram Style with Play Overlay)
  if (isVideoMime) {
    return (
      <div 
        className={`group relative overflow-hidden rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} max-w-[320px] sm:max-w-[360px] ${blobUrl ? 'cursor-pointer' : ''} bg-zinc-950 border border-zinc-800/80 shadow-lg`}
        onClick={() => blobUrl && onMediaClick && onMediaClick(blobUrl, 'video', fileName)}
      >
        <div className="relative flex items-center justify-center bg-black/60 min-h-[180px]">
          {blobUrl ? (
            <video
              src={blobUrl}
              className="w-full max-h-[260px] object-cover rounded-t-2xl opacity-90 group-hover:opacity-100 transition-opacity"
              preload="metadata"
            />
          ) : (
            <div className="w-full h-44 bg-zinc-900/90 flex flex-col items-center justify-center p-4 text-center">
              <Film className="w-10 h-10 text-purple-400 mb-2 animate-pulse" />
              <span className="text-xs text-zinc-300 font-medium truncate max-w-[220px]">{fileName}</span>
            </div>
          )}
          
          {/* Telegram Play Icon Overlay */}
          {blobUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 ml-0.5 fill-white text-white" />
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/90 px-3.5 py-2.5 flex items-center justify-between border-t border-zinc-800/60">
          <div className="flex items-center gap-2 min-w-0">
            <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-xs text-zinc-200 font-medium truncate">{fileName}</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-semibold flex-shrink-0 ml-2">{formatBytes(fileSize)}</span>
        </div>
      </div>
    );
  }

  // Audio preview
  if (isAudioMime) {
    return (
      <div className={`bg-zinc-900/80 border border-zinc-800/80 rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} p-3 max-w-[280px] shadow-md`}>
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-zinc-300 truncate font-medium">{fileName}</span>
          <span className="text-[10px] text-zinc-500 flex-shrink-0">{formatBytes(fileSize)}</span>
        </div>
        {blobUrl && <audio src={blobUrl} controls className="w-full h-8" preload="metadata" />}
      </div>
    );
  }

  // Default file card
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} text-zinc-300 w-fit max-w-[300px] group/file shadow-md`}>
      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
        {getFileIcon(mimeType)}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[12px] font-semibold text-emerald-400 mb-0.5">Файл передано</span>
        <span className="text-xs font-medium truncate text-zinc-200" title={fileName}>
          {fileName}
        </span>
        <span className="text-[11px] text-zinc-500 font-normal">
          {formatBytes(fileSize)}
        </span>
      </div>
      {blobUrl && (
        <a
          href={blobUrl}
          download={fileName}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors opacity-80 group-hover/file:opacity-100"
          title="Завантажити"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};
