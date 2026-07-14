import { formatBytes } from '@/lib/webrtc';
import { FileCheck } from 'lucide-react';

export const FileMessage = ({
  fileName,
  fileSize
}: {
  fileName: string;
  fileSize: number;
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl rounded-bl-sm text-zinc-300 w-fit">
      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-emerald-400">
        <FileCheck className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-emerald-400 mb-0.5">Файл передано</span>
        <span className="text-sm font-medium truncate max-w-[200px]" title={fileName}>
          {fileName}
        </span>
        <span className="text-xs text-zinc-500">
          {formatBytes(fileSize)}
        </span>
      </div>
    </div>
  );
};
