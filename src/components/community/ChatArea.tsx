'use client';

import { useState } from 'react';
import { Message, Channel } from './types';
import { 
  Hash, Bell, Pin, Users, Search, Inbox, HelpCircle, PlusCircle, 
  Gift, Sticker, Smile, Play, Send, Image as ImageIcon
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
    <div className="flex-1 bg-[#313338] flex flex-col h-full min-w-0 relative">
      {/* Header */}
      <div className="h-12 px-4 border-b border-[#1f2023]/60 flex items-center justify-between shadow-sm bg-[#313338] z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-6 h-6 text-[#80848e] flex-shrink-0" />
          <span className="font-bold text-white text-base truncate">{channel.name}</span>
          <div className="hidden sm:block w-[1px] h-4 bg-[#3f4147] mx-2" />
          <span className="hidden md:block text-xs text-[#949ba4] truncate">
            Головний текстовий чат спільноти
          </span>
        </div>

        {/* Toolbar Icons */}
        <div className="flex items-center gap-3 text-[#b5bac1]">
          <button className="hover:text-white transition-colors" title="Сповіщення">
            <Bell className="w-5 h-5" />
          </button>
          <button className="hover:text-white transition-colors" title="Закріплені повідомлення">
            <Pin className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleMembersPanel}
            className={`transition-colors ${showMembersPanel ? 'text-white' : 'hover:text-white'}`} 
            title="Панель учасників"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Search Bar */}
          <div className="relative hidden lg:block w-36 focus-within:w-60 transition-all duration-200">
            <input 
              type="text" 
              placeholder="Пошук" 
              className="w-full bg-[#1e1f22] text-xs text-white placeholder-[#949ba4] px-2 py-1 pr-6 rounded focus:outline-none focus:ring-1 focus:ring-[#5865f2]" 
            />
            <Search className="w-3.5 h-3.5 text-[#949ba4] absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          <button className="hover:text-white transition-colors hidden sm:block" title="Поштовий ящик">
            <Inbox className="w-5 h-5" />
          </button>
          <button className="hover:text-white transition-colors hidden sm:block" title="Довідка">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const isSameAuthor = prevMsg && prevMsg.author === msg.author;

          return (
            <div key={msg.id} className={`group flex gap-4 hover:bg-[#2e3035] -mx-4 px-4 py-1 rounded transition-colors ${!isSameAuthor ? 'mt-3' : ''}`}>
              {!isSameAuthor ? (
                <img 
                  src={msg.avatarUrl} 
                  alt={msg.author} 
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5" 
                />
              ) : (
                <div className="w-10 flex-shrink-0 text-right opacity-0 group-hover:opacity-100 text-[10px] text-[#949ba4] pt-1 select-none">
                  {msg.timestamp.split(' ')[1] || msg.timestamp}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!isSameAuthor && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span 
                      className="font-semibold text-sm hover:underline cursor-pointer"
                      style={{ color: msg.nameColor || '#dbdee1' }}
                    >
                      {msg.author}
                    </span>
                    <span className="text-[11px] text-[#949ba4]">
                      {msg.timestamp}
                    </span>
                  </div>
                )}

                {/* Text Content */}
                {msg.content && (
                  <p className="text-sm text-[#dbdee1] leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content.includes('http') ? (
                      <span dangerouslySetInnerHTML={{
                        __html: msg.content.replace(
                          /(https?:\/\/[^\s]+)/g, 
                          '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#00a8fc] hover:underline">$1</a>'
                        )
                      }} />
                    ) : (
                      msg.content
                    )}
                  </p>
                )}

                {/* Image attachment */}
                {msg.imageUrl && (
                  <div className="mt-2 max-w-lg rounded-xl overflow-hidden border border-[#383a40] shadow-lg">
                    <img 
                      src={msg.imageUrl} 
                      alt="Attachment" 
                      className="w-full h-auto max-h-96 object-cover hover:scale-[1.01] transition-transform cursor-pointer" 
                    />
                  </div>
                )}

                {/* YouTube Embed Card */}
                {msg.embed && (
                  <div className="mt-2.5 max-w-md bg-[#2b2d31] rounded-md border-l-4 border-[#f23f43] p-3 shadow-md space-y-2">
                    <div className="text-xs text-[#949ba4] font-medium flex items-center gap-1.5">
                      <span>{msg.embed.source}</span>
                    </div>

                    {msg.embed.author && (
                      <div className="text-xs text-[#dbdee1] font-semibold">
                        {msg.embed.author}
                      </div>
                    )}

                    <h4 className="text-sm font-bold text-[#00a8fc] hover:underline cursor-pointer">
                      {msg.embed.title}
                    </h4>

                    {/* Embed Video Thumbnail */}
                    {msg.embed.thumbnailUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-[#383a40] group cursor-pointer aspect-video bg-black/40">
                        <img 
                          src={msg.embed.thumbnailUrl} 
                          alt={msg.embed.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="w-14 h-10 rounded-xl bg-black/70 group-hover:bg-[#f23f43] text-white flex items-center justify-center transition-colors shadow-2xl">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
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
        <form onSubmit={handleSubmit} className="bg-[#383a40] rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-lg">
          <button 
            type="button" 
            className="text-[#b5bac1] hover:text-white bg-[#4e5058] hover:bg-[#6d6f78] p-1 rounded-full transition-colors flex-shrink-0"
            title="Прикріпити файл"
          >
            <PlusCircle className="w-5 h-5" />
          </button>

          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Написати #${channel.name}`}
            className="w-full bg-transparent text-sm text-white placeholder-[#80848e] focus:outline-none"
          />

          <div className="flex items-center gap-2 text-[#b5bac1] flex-shrink-0">
            <button type="button" className="hover:text-white transition-colors hidden sm:block" title="Подарунок">
              <Gift className="w-5 h-5 text-[#f47fff]" />
            </button>
            <button type="button" className="hover:text-white transition-colors text-xs font-bold bg-[#4e5058] px-1.5 py-0.5 rounded" title="GIF">
              GIF
            </button>
            <button type="button" className="hover:text-white transition-colors hidden sm:block" title="Стікери">
              <Sticker className="w-5 h-5" />
            </button>
            <button type="button" className="hover:text-white transition-colors" title="Емодзі">
              <Smile className="w-5 h-5 text-[#f0b232]" />
            </button>
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white p-1.5 rounded-lg transition-colors disabled:opacity-40"
              title="Надіслати"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
