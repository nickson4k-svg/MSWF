'use client';

import { useState } from 'react';
import { Message, Channel } from './types';
import { 
  Hash, Bell, Pin, Users, Search, Inbox, HelpCircle, PlusCircle, 
  Gift, Sticker, Smile, Play, Send
} from 'lucide-react';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (text: string) => void;
  toggleMembersPanel: () => void;
  showMembersPanel: boolean;
}

export function ChatArea({ channel, messages, onSendMessage, toggleMembersPanel, showMembersPanel }: ChatAreaProps) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex-1 bg-zinc-950/60 backdrop-blur-xl flex flex-col h-full min-w-0 relative border-x border-zinc-800/50">
      {/* Header */}
      <div className="h-12 px-4 border-b border-zinc-800/60 flex items-center justify-between shadow-sm bg-zinc-950/80 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span className="font-bold text-zinc-100 text-sm truncate">{channel.name}</span>
          <div className="hidden sm:block w-[1px] h-4 bg-zinc-800 mx-2" />
          <span className="hidden md:block text-xs text-zinc-400 truncate">
            Головний текстовий чат спільноти
          </span>
        </div>

        {/* Toolbar Icons */}
        <div className="flex items-center gap-3 text-zinc-400">
          <button className="hover:text-white transition-colors" title="Сповіщення">
            <Bell className="w-4 h-4" />
          </button>
          <button className="hover:text-white transition-colors" title="Закріплені повідомлення">
            <Pin className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleMembersPanel}
            className={`transition-colors ${showMembersPanel ? 'text-white' : 'hover:text-white'}`} 
            title="Панель учасників"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Search Bar */}
          <div className="relative hidden lg:block w-36 focus-within:w-56 transition-all duration-200">
            <input 
              type="text" 
              placeholder="Пошук..." 
              className="w-full bg-zinc-900/90 text-xs text-white placeholder-zinc-500 px-3 py-1 pr-7 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500" 
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button className="hover:text-white transition-colors hidden sm:block" title="Поштовий ящик">
            <Inbox className="w-4 h-4" />
          </button>
          <button className="hover:text-white transition-colors hidden sm:block" title="Довідка">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const isSameAuthor = prevMsg && prevMsg.author === msg.author;

          return (
            <div key={msg.id} className={`group flex gap-3.5 hover:bg-zinc-900/40 -mx-4 px-4 py-1.5 rounded-xl transition-colors ${!isSameAuthor ? 'mt-3' : ''}`}>
              {!isSameAuthor ? (
                <img 
                  src={msg.avatarUrl} 
                  alt={msg.author} 
                  className="w-9 h-9 rounded-xl object-cover flex-shrink-0 mt-0.5 border border-zinc-800" 
                />
              ) : (
                <div className="w-9 flex-shrink-0 text-right opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 pt-1 select-none font-mono">
                  {msg.timestamp.split(' ')[1] || msg.timestamp}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!isSameAuthor && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span 
                      className="font-semibold text-sm hover:underline cursor-pointer"
                      style={{ color: msg.nameColor || '#f4f4f5' }}
                    >
                      {msg.author}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                )}

                {/* Text Content */}
                {msg.content && (
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content.includes('http') ? (
                      <span dangerouslySetInnerHTML={{
                        __html: msg.content.replace(
                          /(https?:\/\/[^\s]+)/g, 
                          '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>'
                        )
                      }} />
                    ) : (
                      msg.content
                    )}
                  </p>
                )}

                {/* Image attachment */}
                {msg.imageUrl && (
                  <div className="mt-2.5 max-w-md rounded-2xl overflow-hidden border border-zinc-800 shadow-xl bg-zinc-900">
                    <img 
                      src={msg.imageUrl} 
                      alt="Attachment" 
                      className="w-full h-auto max-h-96 object-cover hover:scale-[1.01] transition-transform cursor-pointer" 
                    />
                  </div>
                )}

                {/* YouTube Embed Card */}
                {msg.embed && (
                  <div className="mt-2.5 max-w-md bg-zinc-900/90 rounded-2xl border-l-4 border-red-500 border-y border-r border-zinc-800 p-3.5 shadow-xl space-y-2">
                    <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                      <span>{msg.embed.source}</span>
                    </div>

                    {msg.embed.author && (
                      <div className="text-xs text-zinc-200 font-semibold">
                        {msg.embed.author}
                      </div>
                    )}

                    <h4 className="text-sm font-bold text-blue-400 hover:underline cursor-pointer">
                      {msg.embed.title}
                    </h4>

                    {/* Embed Video Thumbnail */}
                    {msg.embed.thumbnailUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-800 group cursor-pointer aspect-video bg-black/50">
                        <img 
                          src={msg.embed.thumbnailUrl} 
                          alt={msg.embed.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-12 h-9 rounded-xl bg-black/70 group-hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-2xl group-hover:scale-110">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 pt-0">
        <form onSubmit={handleSubmit} className="bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-xl focus-within:border-blue-500/50 transition-all">
          <button 
            type="button" 
            className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-xl transition-colors flex-shrink-0"
            title="Прикріпити файл"
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Написати у #${channel.name}...`}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />

          <div className="flex items-center gap-2 text-zinc-400 flex-shrink-0">
            <button type="button" className="hover:text-white transition-colors hidden sm:block" title="Подарунок">
              <Gift className="w-4.5 h-4.5 text-purple-400" />
            </button>
            <button type="button" className="hover:text-white transition-colors text-[10px] font-bold bg-zinc-800 px-1.5 py-0.5 rounded-lg border border-zinc-700" title="GIF">
              GIF
            </button>
            <button type="button" className="hover:text-white transition-colors hidden sm:block" title="Стікери">
              <Sticker className="w-4.5 h-4.5" />
            </button>
            <button type="button" className="hover:text-white transition-colors" title="Емодзі">
              <Smile className="w-4.5 h-4.5 text-amber-400" />
            </button>
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-colors disabled:opacity-40 shadow-md"
              title="Надіслати"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
