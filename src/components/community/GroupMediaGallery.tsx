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
    sender: 'NK2',
    date: '05.08.2026',
    size: '777 KB'
  },
  {
    id: 'med-2',
    type: 'video',
    title: 'ВИШНІ Status///REMAKE (Cyberkozaz Synthwave)',
    url: 'https://www.youtube.com/watch?v=7pyMb3MgU_E',
    thumbnailUrl: '/youtube_thumb.png',
    sender: 'NK2',
    date: '05.08.2026'
  },
  {
    id: 'med-3',
    type: 'file',
    title: 'Project_Architecture_v2.pdf',
    url: '#',
    sender: 'NK2',
    date: '04.08.2026',
    size: '2.4 MB'
  },
  {
    id: 'med-4',
    type: 'image',
    title: 'Nexus_UI_Mockup.png',
    url: 'https://api.dicebear.com/7.x/identicon/svg?seed=NexusUI',
    thumbnailUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=NexusUI',
    sender: 'NK2',
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
    <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
      {/* Gallery Header & Filter Tags */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 aurora-divider pb-4 border-b-0">
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
            Усі ({MOCK_MEDIA.length})
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'image' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow glow-active' : 'text-white/40 hover:text-white/80'
            }`}
          >
            Фото
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'video' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow glow-active' : 'text-white/40 hover:text-white/80'
            }`}
          >
            Відео
          </button>
          <button
            onClick={() => setFilter('file')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filter === 'file' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow glow-active' : 'text-white/40 hover:text-white/80'
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
                <button 
                  className="text-white/40 hover:text-white transition-colors p-1"
                  title="Відкрити"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
