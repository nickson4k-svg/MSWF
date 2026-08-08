'use client';

import { useState } from 'react';
import { Image as ImageIcon, FileText, ExternalLink, Play } from 'lucide-react';

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

const MOCK_MEDIA: MediaItem[] = [
  {
    id: 'med-1',
    type: 'image',
    title: 'Minecraft TNT Base Meme',
    url: '/meme.png',
    thumbnailUrl: '/meme.png',
    sender: 'NicoNico',
    date: '05.08.2026',
    size: '777 KB'
  },
  {
    id: 'med-2',
    type: 'video',
    title: 'ВИШНІ Status///REMAKE (Cyberkozaz Synthwave)',
    url: 'https://www.youtube.com/watch?v=7pyMb3MgU_E',
    thumbnailUrl: '/youtube_thumb.png',
    sender: 'Габа Шен Пуер',
    date: '05.08.2026'
  },
  {
    id: 'med-3',
    type: 'file',
    title: 'Project_Architecture_v2.pdf',
    url: '#',
    sender: 'lunati',
    date: '04.08.2026',
    size: '2.4 MB'
  },
  {
    id: 'med-4',
    type: 'image',
    title: 'Nexus_UI_Mockup.png',
    url: 'https://api.dicebear.com/7.x/identicon/svg?seed=NexusUI',
    sender: 'rxqzzz',
    date: '03.08.2026',
    size: '1.1 MB'
  }
];

export function GroupMediaGallery() {
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'file'>('all');

  const filteredMedia = filter === 'all' 
    ? MOCK_MEDIA 
    : MOCK_MEDIA.filter(m => m.type === filter);

  return (
    <div className="flex-1 bg-zinc-950/60 backdrop-blur-xl p-6 overflow-y-auto no-scrollbar space-y-6">
      {/* Gallery Header & Filter Tags */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            Спільні медіа та файли
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Усі фотографії, відео та документи, надіслані учасниками у чаті цієї групи.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Усі ({MOCK_MEDIA.length})
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'image' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Фото
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'video' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Відео
          </button>
          <button
            onClick={() => setFilter('file')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'file' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Файли
          </button>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMedia.map((item) => (
          <div 
            key={item.id} 
            className="group bg-zinc-900/80 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl hover:border-purple-500/50 transition-all flex flex-col"
          >
            {/* Preview Box */}
            <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
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
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-400 p-4">
                  <FileText className="w-10 h-10 text-purple-400 mb-2" />
                  <span className="text-xs font-mono font-semibold">{item.size}</span>
                </div>
              )}
            </div>

            {/* Content Details */}
            <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
              <div>
                <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-purple-400 transition-colors">
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                  <span>від {item.sender}</span>
                  <span>{item.date}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">{item.type}</span>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Відкрити
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
