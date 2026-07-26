import { useRef, useSyncExternalStore, memo, useState, useMemo } from 'react';
import { FileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferItem } from './FileTransferItem';
import { Plus, Download, File, Image as ImageIcon, FileText, Film, Music, Box, ExternalLink, Link as LinkIcon, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GemSmoke } from '@paper-design/shaders-react';
import { formatBytes } from '@/lib/webrtc';
import { format } from 'date-fns';
import { Message } from './ChatMessageItem';

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

export interface ExtractedLink {
  id: string;
  url: string;
  domain: string;
  sender: string;
  timestamp: number;
}

type FilterTab = 'all' | 'media' | 'files' | 'music' | 'links';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  if (mimeType.startsWith('video/')) return <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Box className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />;
};

const isMediaItem = (item: RoomFileItem) => {
  const mime = item.mimeType.toLowerCase();
  const name = item.fileName.toLowerCase();
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    /\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|mov|mkv|avi)$/i.test(name)
  );
};

const isMusicItem = (item: RoomFileItem) => {
  const mime = item.mimeType.toLowerCase();
  const name = item.fileName.toLowerCase();
  return (
    mime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name) ||
    name.includes('Голосове')
  );
};

const isDocumentItem = (item: RoomFileItem) => {
  return !isMediaItem(item) && !isMusicItem(item);
};

export const FileTransferSidebar = memo(function FileTransferSidebar({
  transfers,
  roomFiles = [],
  messages = [],
  currentUsername = '',
  onSendFile,
  onCancelTransfer,
  isFriendOnline,
  onScrollToMessage
}: {
  transfers: FileTransfer[];
  roomFiles?: RoomFileItem[];
  messages?: Message[];
  currentUsername?: string;
  onSendFile: (file: File) => void;
  onCancelTransfer: (id: string) => void;
  isFriendOnline: boolean;
  onScrollToMessage?: (msgId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const hasActiveTransfers = transfers.some(t => t.status === 'transferring' || t.status === 'connecting');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSendFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Categorize room files
  const mediaItems = useMemo(() => roomFiles.filter(isMediaItem), [roomFiles]);
  const musicItems = useMemo(() => roomFiles.filter(isMusicItem), [roomFiles]);
  const fileItems = useMemo(() => roomFiles.filter(isDocumentItem), [roomFiles]);

  // Extract links from messages
  const links = useMemo<ExtractedLink[]>(() => {
    const list: ExtractedLink[] = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    messages.forEach(msg => {
      if (msg.isDeleted) return;
      if (msg.text.startsWith('data:') || msg.text.startsWith('{"type":')) return;

      const matches = msg.text.match(urlRegex);
      if (matches) {
        matches.forEach((url: string) => {
          try {
            const parsed = new URL(url);
            list.push({
              id: `${msg.id}-${url}`,
              url,
              domain: parsed.hostname.replace('www.', ''),
              sender: msg.sender === currentUsername ? 'Ви' : msg.sender,
              timestamp: msg.timestamp
            });
          } catch {}
        });
      }
    });

    return list.reverse();
  }, [messages, currentUsername]);

  const totalItemCount = transfers.length + roomFiles.length;

  return (
    <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden flex flex-col h-full relative">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center relative overflow-hidden">
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
            <span>Медіа та Файли</span>
            {hasActiveTransfers ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ) : totalItemCount > 0 ? (
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full border border-zinc-700">{totalItemCount}</span>
            ) : null}
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium">Сховище матеріалів кімнати</p>
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

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-1 p-2 bg-zinc-950/60 border-b border-zinc-800/80 overflow-x-auto no-scrollbar scrollbar-none">
        {[
          { id: 'all', label: 'Все', icon: LayoutGrid, count: totalItemCount + links.length },
          { id: 'media', label: 'Медіа', icon: ImageIcon, count: mediaItems.length },
          { id: 'files', label: 'Файли', icon: FileText, count: fileItems.length },
          { id: 'music', label: 'Музика', icon: Music, count: musicItems.length },
          { id: 'links', label: 'Посилання', icon: LinkIcon, count: links.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all flex-shrink-0 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-md font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtered Content List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-14rem)]">
        {activeTab === 'all' && (
          <>
            {totalItemCount === 0 && links.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <p className="text-xs font-medium">Сховище порожнє</p>
                <p className="text-[10px] text-zinc-600 mt-1">Надішліть файл або посилання у чат</p>
              </div>
            ) : (
              <>
                {transfers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 px-1">
                      Активні передачі ({transfers.length})
                    </span>
                    {transfers.map(t => (
                      <FileTransferItem key={t.id} transfer={t} onCancel={onCancelTransfer} />
                    ))}
                  </div>
                )}

                {roomFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
                      Історія файлів ({roomFiles.length})
                    </span>
                    {roomFiles.map(file => (
                      <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} />
                    ))}
                  </div>
                )}

                {links.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 px-1">
                      Посилання ({links.length})
                    </span>
                    {links.map(link => (
                      <LinkCard key={link.id} link={link} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'media' && (
          <div className="space-y-2">
            {mediaItems.length === 0 ? (
              <EmptyState message="Зображення та відео відсутні" />
            ) : (
              mediaItems.map(file => (
                <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} />
              ))
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-2">
            {fileItems.length === 0 ? (
              <EmptyState message="Документи та архіви відсутні" />
            ) : (
              fileItems.map(file => (
                <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} />
              ))
            )}
          </div>
        )}

        {activeTab === 'music' && (
          <div className="space-y-2">
            {musicItems.length === 0 ? (
              <EmptyState message="Музика та голосові відсутні" />
            ) : (
              musicItems.map(file => (
                <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} />
              ))
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-2">
            {links.length === 0 ? (
              <EmptyState message="Надіслані посилання відсутні" />
            ) : (
              links.map(link => (
                <LinkCard key={link.id} link={link} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function FileCard({ file, onScrollToMessage }: { file: RoomFileItem; onScrollToMessage?: (msgId: string) => void }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2.5 hover:bg-zinc-800/60 transition-colors group">
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
  );
}

function LinkCard({ link }: { link: ExtractedLink }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2.5 hover:bg-zinc-800/60 transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0 border border-blue-500/20">
          <LinkIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-zinc-200 font-medium text-xs truncate" title={link.url}>
            {link.domain}
          </p>
          <p className="text-[10px] text-zinc-400 truncate opacity-80" title={link.url}>
            {link.url}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
            <span className="truncate max-w-[70px]">{link.sender}</span>
            <span>•</span>
            <span>{format(new Date(link.timestamp), 'HH:mm')}</span>
          </div>
        </div>
      </div>

      <a 
        href={link.url} 
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-lg hover:bg-zinc-700/80 text-zinc-400 hover:text-blue-400 transition-colors flex-shrink-0"
        title="Відкрити посилання"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-500">
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}
