import { useRef } from 'react';
import { FileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferItem } from './FileTransferItem';
import { FolderUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSendFile(e.target.files[0]);
      e.target.value = ''; // Reset
    }
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden flex flex-col mt-4">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-zinc-100 font-semibold flex items-center gap-2 text-sm">
          <FolderUp className="w-4 h-4 text-blue-500" />
          P2P Файли
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

      <div className="p-3 flex-1 max-h-[300px] overflow-y-auto space-y-2">
        {transfers.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs">
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
