import { useRef, useSyncExternalStore, memo, useState, useMemo } from 'react';
import { FileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferItem } from './FileTransferItem';
import { Plus, Download, File, Image as ImageIcon, FileText, Film, Music, Box, ExternalLink, Link as LinkIcon, LayoutGrid, List } from 'lucide-react';
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

interface FileTransferSidebarProps {
  transfers: FileTransfer[];
  roomFiles: RoomFileItem[];
  messages?: Message[];
  currentUsername?: string;
  onCancelTransfer: (id: string) => void;
  onSendFile: (file: File) => void;
  isFriendOnline: boolean;
  onScrollToMessage?: (msgId: string) => void;
}

export const FileTransferSidebar = memo(function FileTransferSidebar({
  transfers,
  roomFiles,
  messages = [],
  currentUsername = '',
  onCancelTransfer,
  onSendFile,
  isFriendOnline,
  onScrollToMessage,
}: FileTransferSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const hasActiveTransfers = transfers.some(t => t.status === 'transferring' || t.status === 'connecting');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
      e.target.value = '';
    }
  };

  // Categorized files
  const mediaItems = useMemo(() => {
    return roomFiles.filter(f => f.mimeType.startsWith('image/') || f.mimeType.startsWith('video/'));
  }, [roomFiles]);

  const musicItems = useMemo(() => {
    return roomFiles.filter(f => f.mimeType.startsWith('audio/'));
  }, [roomFiles]);

  const fileItems = useMemo(() => {
    return roomFiles.filter(f => !f.mimeType.startsWith('image/') && !f.mimeType.startsWith('video/') && !f.mimeType.startsWith('audio/'));
  }, [roomFiles]);

  // Extract links from messages
  const links = useMemo<ExtractedLink[]>(() => {
    const list: ExtractedLink[] = [];
    const urlRegex = /https?:\/\/[^\s<]+/g;

    messages.forEach(msg => {
      if (msg.isDeleted) return;
      if (msg.text.startsWith('data:')) return;

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
      <div className="p-3.5 border-b border-zinc-800 flex justify-between items-center relative overflow-hidden">
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

        <div className="relative z-10 min-w-0 flex-1">
          <h2 className="font-semibold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5 truncate">
            <span>Матеріали кімнати</span>
            {hasActiveTransfers ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            ) : totalItemCount > 0 ? (
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full border border-zinc-700 flex-shrink-0">{totalItemCount}</span>
            ) : null}
          </h2>
          <p className="text-[10px] text-zinc-500 font-medium truncate">Сховище файлів та медіа</p>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect} 
        />

        <div className="flex items-center gap-1.5 z-10 flex-shrink-0">
          {/* View mode toggle (Grid blocks vs List) */}
          <div className="flex items-center bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Блоками (Сітка)"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' 
                  ? 'bg-zinc-800 text-emerald-400 font-bold border border-emerald-500/30 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Списком"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' 
                  ? 'bg-zinc-800 text-emerald-400 font-bold border border-emerald-500/30 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs gap-1 shadow-lg shadow-emerald-950/40 border border-emerald-500/30 px-2.5 h-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isFriendOnline}
            title={isFriendOnline ? "Надіслати файл" : "Співрозмовник офлайн"}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Файл</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs Bar (5 Columns Grid - 100% Width Fit) */}
      <div className="grid grid-cols-5 gap-1 p-1.5 bg-zinc-950/70 border-b border-zinc-800/80">
        {[
          { id: 'all', label: 'Все', icon: LayoutGrid, count: totalItemCount + links.length },
          { id: 'media', label: 'Медіа', icon: ImageIcon, count: mediaItems.length },
          { id: 'files', label: 'Файли', icon: FileText, count: fileItems.length },
          { id: 'music', label: 'Музика', icon: Music, count: musicItems.length },
          { id: 'links', label: 'Ліинки', icon: LinkIcon, count: links.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FilterTab)}
            title={`${tab.label} (${tab.count})`}
            className={`py-1.5 px-0.5 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-all relative ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 shadow-sm font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <tab.icon className="w-3.5 h-3.5" />
              {tab.count > 0 && (
                <span className={`absolute -top-1.5 -right-2 text-[8px] font-bold px-1 py-0.2 rounded-full min-w-[14px] text-center ${
                  activeTab === tab.id ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </div>
            <span className="truncate max-w-full leading-none text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filtered Content List / Grid */}
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
                    <div className="space-y-2">
                      {transfers.map(t => (
                        <FileTransferItem key={t.id} transfer={t} onCancel={onCancelTransfer} />
                      ))}
                    </div>
                  </div>
                )}

                {roomFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
                      Історія файлів ({roomFiles.length})
                    </span>
                    <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                      {roomFiles.map(file => (
                        <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} viewMode={viewMode} />
                      ))}
                    </div>
                  </div>
                )}

                {links.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 px-1">
                      Посилання ({links.length})
                    </span>
                    <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                      {links.map(link => (
                        <LinkCard key={link.id} link={link} viewMode={viewMode} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'media' && (
          <div>
            {mediaItems.length === 0 ? (
              <EmptyState message="Зображення та відео відсутні" />
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                {mediaItems.map(file => (
                  <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div>
            {fileItems.length === 0 ? (
              <EmptyState message="Документи та архіви відсутні" />
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                {fileItems.map(file => (
                  <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'music' && (
          <div>
            {musicItems.length === 0 ? (
              <EmptyState message="Музика та голосові відсутні" />
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                {musicItems.map(file => (
                  <FileCard key={file.id} file={file} onScrollToMessage={onScrollToMessage} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div>
            {links.length === 0 ? (
              <EmptyState message="Надіслані посилання відсутні" />
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                {links.map(link => (
                  <LinkCard key={link.id} link={link} viewMode={viewMode} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function FileCard({ 
  file, 
  onScrollToMessage, 
  viewMode = 'grid' 
}: { 
  file: RoomFileItem; 
  onScrollToMessage?: (msgId: string) => void;
  viewMode?: 'grid' | 'list';
}) {
  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const hasThumbnail = (isImage || isVideo) && file.downloadData;

  if (viewMode === 'grid') {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col justify-between gap-2 hover:bg-zinc-800/80 hover:border-zinc-700/80 transition-all group relative min-h-[110px] shadow-sm">
        {/* Top row: Icon/Thumbnail + Action */}
        <div className="flex items-start justify-between gap-1">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
            {hasThumbnail ? (
              isImage ? (
                <img src={file.downloadData} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={file.downloadData} className="w-full h-full object-cover" />
              )
            ) : (
              getFileIcon(file.mimeType)
            )}
          </div>

          <div className="flex items-center">
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

        {/* Content middle */}
        <div className="min-w-0 flex-1">
          <p className="text-zinc-200 font-semibold text-xs truncate leading-tight" title={file.fileName}>
            {file.fileName}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5 font-normal">
            {formatBytes(file.fileSize)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1.5 border-t border-zinc-800/60">
          <span className="truncate max-w-[65px] font-medium">{file.sender}</span>
          <span className="font-mono">{format(new Date(file.timestamp), 'HH:mm')}</span>
        </div>
      </div>
    );
  }

  // List view (original)
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

function LinkCard({ 
  link, 
  viewMode = 'grid' 
}: { 
  link: ExtractedLink; 
  viewMode?: 'grid' | 'list';
}) {
  if (viewMode === 'grid') {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col justify-between gap-2 hover:bg-zinc-800/80 hover:border-zinc-700/80 transition-all group relative min-h-[110px] shadow-sm">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-1">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0 border border-blue-500/20">
            <LinkIcon className="w-4 h-4" />
          </div>
          <a 
            href={link.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-zinc-700/80 text-zinc-400 hover:text-blue-400 transition-colors"
            title="Відкрити посилання"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Content middle */}
        <div className="min-w-0 flex-1">
          <p className="text-zinc-200 font-semibold text-xs truncate leading-tight" title={link.url}>
            {link.domain}
          </p>
          <p className="text-[10px] text-zinc-400 truncate opacity-80 mt-0.5" title={link.url}>
            {link.url}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1.5 border-t border-zinc-800/60">
          <span className="truncate max-w-[65px] font-medium">{link.sender}</span>
          <span className="font-mono">{format(new Date(link.timestamp), 'HH:mm')}</span>
        </div>
      </div>
    );
  }

  // List view (original)
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
