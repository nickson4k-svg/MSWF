'use client';

import { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, iconUrl?: string) => void;
}

export function CreateServerModal({ isOpen, onClose, onCreate }: CreateServerModalProps) {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), iconUrl.trim() || undefined);
    setName('');
    setIconUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col glow-active">
        {/* Header */}
        <div className="p-6 text-center relative aurora-divider border-b-0 pb-4">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">Створити свою спільноту</h2>
          <p className="text-sm text-white/50 mt-1">
            Ваш сервер — це місце, де ви з друзями спілкуєтеся у голосових та текстових каналах.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2 font-display">
              Назва сервера <span className="text-[var(--status-dnd)]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Космічна станція / Геймери"
              className="glass-panel border-white/10 text-white h-11 px-4 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 placeholder:text-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-display">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              URL Аватарки сервера (опціонально)
            </label>
            <Input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="glass-panel border-white/10 text-white h-11 px-4 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 placeholder:text-white/20"
            />
          </div>

          <div className="pt-4 flex justify-between items-center glass-panel -mx-6 -mb-6 p-4 px-6 border-t-0 border-r-0 border-l-0 rounded-none" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-white/60 hover:text-white hover:underline transition-colors font-display"
            >
              Скасувати
            </button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white px-6 py-2 rounded-xl font-semibold shadow-md glow-active transition-all disabled:opacity-30 font-display border-0"
            >
              Створити
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
