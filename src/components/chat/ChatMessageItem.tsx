'use client';

import { memo, useMemo } from 'react';
import { Reply, Check, CheckCheck, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { parseMarkdown } from '@/lib/markdown';
import { LinkPreview } from './LinkPreview';
import { FileMessage } from './FileMessage';

export interface Message {
  id: string;
  text: string;
  roomId: string;
  sender: string;
  timestamp: number;
  replyTo?: string;
  readBy?: string[];
  ttl?: number;
  reactions?: Record<string, string>;
  editedAt?: number;
  isDeleted?: boolean;
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<]+/);
  return match ? match[0] : null;
}

function getBubbleClasses(theme: string, isMe: boolean): string {
  if (!isMe) return 'bg-zinc-900 border border-zinc-800/80 text-zinc-100';
  switch (theme) {
    case 'sunset': return 'bg-gradient-to-r from-orange-600 to-amber-600 text-white';
    case 'emerald': return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white';
    case 'violet': return 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white';
    case 'ocean': return 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white';
    case 'cyberpunk': return 'bg-gradient-to-r from-pink-600 to-purple-600 text-white';
    case 'forest': return 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white';
    case 'rose': return 'bg-gradient-to-r from-rose-600 to-red-600 text-white';
    default: return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';
  }
}

interface ChatMessageItemProps {
  msg: Message;
  isMe: boolean;
  showSender: boolean;
  showDateSeparator: boolean;
  dateLabel: string;
  repliedMsg: Message | null;
  selectionMode: boolean;
  isSelected: boolean;
  theme: string;
  username: string;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
  onReaction: (msgId: string, emoji: string) => void;
  onReply: (msg: Message) => void;
  onScrollToReply: (replyId: string) => void;
}

export const ChatMessageItem = memo(function ChatMessageItem({
  msg,
  isMe,
  showSender,
  showDateSeparator,
  dateLabel,
  repliedMsg,
  selectionMode,
  isSelected,
  theme,
  username,
  onSelect,
  onContextMenu,
  onReaction,
  onReply,
  onScrollToReply,
}: ChatMessageItemProps) {
  // Memoize heavy markdown parsing
  const parsedHtml = useMemo(() => {
    if (msg.text.startsWith('data:audio/')) return '';
    return parseMarkdown(msg.text);
  }, [msg.text]);

  // Memoize link extraction
  const firstUrl = useMemo(() => {
    if (msg.text.startsWith('{"type":"file-transfer-meta"')) return null;
    return extractFirstUrl(msg.text);
  }, [msg.text]);

  const { isFileMeta, fileMetaData } = useMemo(() => {
    if (msg.text.startsWith('{"type":"file-transfer-meta"')) {
      try {
        return { isFileMeta: true, fileMetaData: JSON.parse(msg.text) };
      } catch {}
    }
    return { isFileMeta: false, fileMetaData: null };
  }, [msg.text]);

  const isRead = isMe && Boolean(msg.readBy && msg.readBy.length > 0);

  const reactionsGrouped = useMemo(() => {
    if (!msg.reactions || Object.keys(msg.reactions).length === 0) return null;
    return Object.entries(
      Object.values(msg.reactions).reduce((acc: Record<string, number>, emoji: string) => {
        acc[emoji] = (acc[emoji] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    );
  }, [msg.reactions]);

  return (
    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '0 60px' }}>
      {/* Date separator */}
      {showDateSeparator && (
        <div className="flex items-center gap-4 py-4">
          <div className="flex-1 h-px bg-zinc-800/60" />
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{dateLabel}</span>
          <div className="flex-1 h-px bg-zinc-800/60" />
        </div>
      )}
      <div 
        id={`msg-${msg.id}`} 
        className={`flex flex-col w-full transition-all duration-300 rounded-xl animate-slide-up ${isMe ? 'items-end' : 'items-start'} ${showSender ? 'mt-4' : 'mt-0.5'}`}
        onContextMenu={(e) => onContextMenu(e, msg)}
      >
        {!isMe && showSender && (
          <span className="text-[11px] font-medium text-zinc-500 mb-1.5 ml-2">{msg.sender}</span>
        )}
        
        {/* Reply quote */}
        {repliedMsg && (
          <div 
            className={`flex items-center gap-2 mb-1 px-3 py-1.5 rounded-lg cursor-pointer bg-zinc-800/50 border-l-2 border-blue-500 max-w-[70%] hover:bg-zinc-800 transition-colors ${isMe ? 'mr-2' : 'ml-2'}`}
            onClick={() => onScrollToReply(repliedMsg.id)}
          >
            <Reply className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-blue-400 font-semibold">{repliedMsg.sender}</span>
              <p className="text-[11px] text-zinc-400 truncate">{repliedMsg.text}</p>
            </div>
          </div>
        )}

        <div className="group relative flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
          {selectionMode && (
            <div 
              className={`w-5 h-5 rounded border flex-shrink-0 cursor-pointer flex items-center justify-center mr-2 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-600 bg-zinc-800'}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(msg.id);
              }}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}
          
          {/* Reaction Button on Hover */}
          <div className={`absolute top-0 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 border border-zinc-700 p-1.5 rounded-full shadow-xl flex gap-1 z-20 ${isMe ? 'right-0' : 'left-0'}`}>
            {['👍', '❤️', '😂', '😮', '😡'].map(emoji => (
              <button 
                key={emoji}
                onClick={() => onReaction(msg.id, emoji)}
                className={`hover:bg-zinc-700 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-125 ${msg.reactions?.[username] === emoji ? 'bg-zinc-700 bg-opacity-50' : ''}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {isFileMeta && fileMetaData ? (
            <FileMessage 
              fileName={fileMetaData.fileName} 
              fileSize={fileMetaData.fileSize}
              mimeType={fileMetaData.mimeType}
              isMe={isMe}
            />
          ) : msg.isDeleted ? (
            <div className={`px-5 py-3 shadow-lg bg-zinc-900 border border-zinc-800/80 text-zinc-500 italic rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
              Повідомлення видалено
            </div>
          ) : (
            <div 
              className={`
                px-5 py-3 shadow-lg 
                ${isMe ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}
                ${getBubbleClasses(theme, isMe)}
              `}
            >
              {msg.text.startsWith('data:audio/') ? (
                <audio controls src={msg.text} className="max-w-[200px] sm:max-w-[250px] h-10" />
              ) : (
                <p className="text-[15px] leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: parsedHtml }} />
              )}
              
              {msg.editedAt && (
                <span className="text-[10px] text-zinc-400 opacity-70 ml-2">(змінено)</span>
              )}

              {/* Auto-destruct indicator */}
              {msg.ttl && (
                <div className="flex items-center gap-1 mt-1 text-amber-400/80">
                  <Timer className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Самознищення: {msg.ttl < 60 ? `${msg.ttl}с` : msg.ttl < 3600 ? `${Math.floor(msg.ttl / 60)}хв` : `${Math.floor(msg.ttl / 3600)}д`}</span>
                </div>
              )}

              {/* Display Reactions */}
              {reactionsGrouped && (
                <div className={`absolute -bottom-3 flex items-center gap-1 ${isMe ? 'right-2' : 'left-2'}`}>
                  {reactionsGrouped.map(([emoji, count]) => (
                    <span key={emoji} className="bg-zinc-800 border border-zinc-700 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      {emoji} <span className="text-zinc-400">{count > 1 ? count : ''}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reply button on hover */}
          <button 
            onClick={() => onReply(msg)}
            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 absolute ${isMe ? '-left-8' : '-right-8'} bottom-1`}
            title="Відповісти"
          >
            <Reply className="w-4 h-4" />
          </button>
        </div>

        {/* Link preview */}
        {!isFileMeta && firstUrl && (
          <div className={`${isMe ? 'mr-2' : 'ml-2'}`}>
            <LinkPreview url={firstUrl} />
          </div>
        )}

        {/* Timestamp + Read receipts */}
        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'mr-2' : 'ml-2'}`}>
          <span className="text-[10px] font-medium text-zinc-600">
            {format(new Date(msg.timestamp), 'HH:mm')}
          </span>
          {isMe && (
            isRead 
              ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              : <Check className="w-3.5 h-3.5 text-zinc-600" />
          )}
        </div>
      </div>
    </div>
  );
});
