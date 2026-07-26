'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, RotateCw, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  fileName: string;
  sender: string;
  timestamp: number;
}

interface MediaViewerModalProps {
  mediaList: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function MediaViewerModal({
  mediaList,
  currentIndex,
  onClose,
  onNavigate,
}: MediaViewerModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeMedia = mediaList[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < mediaList.length - 1) {
      setZoomLevel(1);
      setRotation(0);
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, mediaList.length, onNavigate]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setZoomLevel(1);
      setRotation(0);
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  // Keyboard navigation & Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (!activeMedia) return null;

  const copyMediaUrl = () => {
    navigator.clipboard.writeText(activeMedia.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {(activeMedia.sender[0] || 'U').toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{activeMedia.sender}</h3>
            <p className="text-xs text-zinc-400">
              {format(new Date(activeMedia.timestamp), 'HH:mm dd.MM.yyyy')}
              {mediaList.length > 1 && (
                <span className="ml-2 text-zinc-500 font-medium">({currentIndex + 1} з {mediaList.length})</span>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {activeMedia.type === 'image' && (
            <>
              <button
                onClick={() => setZoomLevel(prev => (prev < 3 ? prev + 0.5 : 1))}
                className="p-2.5 rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800"
                title="Збільшити"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2.5 rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800"
                title="Повернути"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            onClick={copyMediaUrl}
            className="p-2.5 rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800"
            title="Скопіювати посилання"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          </button>

          <a
            href={activeMedia.url}
            download={activeMedia.fileName}
            className="p-2.5 rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800"
            title="Завантажити"
          >
            <Download className="w-5 h-5" />
          </a>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800 ml-2"
            title="Закрити (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {/* Navigation Arrow Previous */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 z-20 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/90 transition-all transform hover:scale-110 backdrop-blur-md"
            title="Попереднє (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Navigation Arrow Next */}
        {currentIndex < mediaList.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-20 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/90 transition-all transform hover:scale-110 backdrop-blur-md"
            title="Наступне (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Active Media Display */}
        <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
          {activeMedia.type === 'image' ? (
            <img
              src={activeMedia.url}
              alt={activeMedia.fileName}
              className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl transition-transform duration-300"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              }}
            />
          ) : (
            <video
              src={activeMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-[82vh] rounded-xl shadow-2xl border border-zinc-800"
            />
          )}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center text-xs text-zinc-400 z-10">
        <span className="truncate max-w-md font-medium text-zinc-300">{activeMedia.fileName}</span>
        <span className="text-[11px] text-zinc-500">Клавіші: ← → Навігація | Esc Закрити</span>
      </div>
    </div>
  );
}
