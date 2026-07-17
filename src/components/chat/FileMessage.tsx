import { formatBytes } from '@/lib/webrtc';
import { FileCheck, Download, Image as ImageIcon, Film, Music, FileText, Box, File } from 'lucide-react';
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
  mimeType,
  blobUrl,
  isMe
}: {
  fileName: string;
  fileSize: number;
  mimeType?: string;
  blobUrl?: string;
  isMe?: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  const isImage = mimeType?.startsWith('image/') && blobUrl && !imageError;
  const isVideo = mimeType?.startsWith('video/') && blobUrl;
  const isAudio = mimeType?.startsWith('audio/') && blobUrl;

  // Image preview
  if (isImage) {
    return (
      <div className={`group relative overflow-hidden rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} max-w-[280px] sm:max-w-[320px]`}>
        <img
          src={blobUrl}
          alt={fileName}
          className="w-full max-h-[300px] object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        {/* Overlay with file info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-white text-xs font-medium truncate max-w-[200px]">{fileName}</span>
              <span className="text-zinc-300 text-[10px]">{formatBytes(fileSize)}</span>
            </div>
            {blobUrl && (
              <a
                href={blobUrl}
                download={fileName}
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Video preview
  if (isVideo) {
    return (
      <div className={`overflow-hidden rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} max-w-[320px]`}>
        <video
          src={blobUrl}
          controls
          className="w-full max-h-[240px] rounded-t-2xl"
          preload="metadata"
        />
        <div className="bg-zinc-900/80 border border-zinc-800/80 border-t-0 rounded-b-2xl px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-xs text-zinc-300 truncate">{fileName}</span>
          </div>
          <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2">{formatBytes(fileSize)}</span>
        </div>
      </div>
    );
  }

  // Audio preview
  if (isAudio) {
    return (
      <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} p-3 max-w-[280px]`}>
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-zinc-300 truncate">{fileName}</span>
          <span className="text-[10px] text-zinc-500 flex-shrink-0">{formatBytes(fileSize)}</span>
        </div>
        <audio src={blobUrl} controls className="w-full h-8" preload="metadata" />
      </div>
    );
  }

  // Default file card
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} text-zinc-300 w-fit max-w-[280px] group/file`}>
      <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center flex-shrink-0">
        {getFileIcon(mimeType || '')}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[13px] font-semibold text-emerald-400 mb-0.5">Файл передано</span>
        <span className="text-sm font-medium truncate" title={fileName}>
          {fileName}
        </span>
        <span className="text-xs text-zinc-500">
          {formatBytes(fileSize)}
        </span>
      </div>
      {blobUrl && (
        <a
          href={blobUrl}
          download={fileName}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors opacity-0 group-hover/file:opacity-100"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};
