'use client';

import { useState, useMemo } from 'react';
import { Image as ImageIcon, FileText, ExternalLink, Play, FolderKanban } from 'lucide-react';
import { Message } from './types';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'file';
  title: string;
  url: string;
  thumbnailUrl?: string;
  sender: string;
  date: string;
  size?: string;
}

interface GroupMediaGalleryProps {
  messages?: Message[];
}

export function GroupMediaGallery({ messages = [] }: GroupMediaGalleryProps) {
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'file'>('all');

  // Extract dynamic media from actual messages sent in the community
  const mediaList = useMemo(() => {
    const items: MediaItem[] = [];
    
    messages.forEach(msg => {
      if (!msg.content) return;

      if (msg.content.startsWith('data:image/') || msg.content.match(/\.(jpeg|jpg|gif|png|webp|svg)/i)) {
        items.push({
          id: msg.id,
          type: 'image',
          title: `Зображення_${msg.id.substring(0, 6)}`,
          url: msg.content,
          thumbnailUrl: msg.content,
          sender: msg.author,
          date: msg.timestamp,
          size: 'Зображення'
        });
      } else if (msg.content.startsWith('data:video/') || msg.content.match(/\.(mp4|webm|ogg)/i)) {
        items.push({
          id: msg.id,
          type: 'video',
          title: `Відео_${msg.id.substring(0, 6)}`,
          url: msg.content,
          thumbnailUrl: msg.content,
          sender: msg.author,
          date: msg.timestamp,
          size: 'Відео'
        });
      } else if (msg.type === 'file' || msg.content.startsWith('data:application/')) {
        items.push({
          id: msg.id,
          type: 'file',
          title: `Документ_${msg.id.substring(0, 6)}`,
          url: msg.content,
          sender: msg.author,
          date: msg.timestamp,
          size: 'Файл'
        });
      }
    });

    return items;
  }, [messages]);

  const filteredMedia = filter === 'all' 
    ? mediaList 
    : mediaList.filter(m => m.type === filter);

  return (
    <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6 flex flex-col">
      {/* Gallery Header & Filter Tags */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 aurora-divider pb-4 border-b-0 flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            Спільні медіа та файли
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Усі фотографії, відео та документи, надіслані учасниками у чаті цієї групи.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 glass-panel p-1 rounded-2xl font-display">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow glow-active' : 'text-white/40 hover:text-white/80'
            }`}
          >
            Усі ({mediaList.length})
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'image' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow glow-active' : 'text-white/40 hover:text-white/80'
            }`}
          >
            Фото ({mediaList.filter(m => m.type === 'image').length})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'video' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow glow-active' : 'text-white/40 hover:text-white/80'
            }`}
          >
            Відео ({mediaList.filter(m => m.type === 'video').length})
          </button>
          <button
            onClick={() => setFilter('file')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'file' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow glow-active' : 'text-white/40 hover:text-white/80'
            }`}
          >
            Файли ({mediaList.filter(m => m.type === 'file').length})
          </button>
        </div>
      </div>

      {/* Media Grid or Clean Empty State */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <div 
              key={item.id} 
              className="group glass-panel rounded-2xl overflow-hidden shadow-xl hover:border-indigo-400/40 transition-all flex flex-col hover:glow-active"
            >
              {/* Preview Box */}
              <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                {item.type === 'image' && item.thumbnailUrl ? (
                  <img 
                    src={item.thumbnailUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : item.type === 'video' && item.thumbnailUrl ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={item.thumbnailUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform glow-active">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/40 p-4">
                    <FileText className="w-10 h-10 text-indigo-400 mb-2" />
                    <span className="text-xs font-mono font-semibold">{item.size}</span>
                  </div>
                )}
              </div>

              {/* Content Details */}
              <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors font-display">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                    <span>від {item.sender}</span>
                    <span>{item.date}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                  <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider font-display">
                    {item.type}
                  </span>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors p-1"
                    title="Відкрити"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 glass-panel rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-xl">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-base font-bold text-white font-display">
              Немає надісланих медіафайлів
            </h4>
            <p className="text-xs text-white/40 leading-relaxed">
              Усі фотографії, відео та файли, надіслані учасниками у чаті цієї групи, будуть автоматично зберігатися та відображатися тут.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
