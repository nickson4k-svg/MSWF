'use client';

import { useState } from 'react';
import { X, Hash, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, type: 'text' | 'voice') => void;
}

export function CreateChannelModal({ isOpen, onClose, onCreateChannel }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateChannel(name.trim().toLowerCase().replace(/\s+/g, '-'), type);
    setName('');
    setType('text');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col glow-active">
        {/* Header */}
        <div className="p-6 text-center relative aurora-divider border-b-0 pb-4">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold text-white tracking-tight font-display">Створити Канал</h2>
          <p className="text-xs text-white/50 mt-1">
            Канали — це тематичні кімнати для текстового або голосового спілкування спільноти.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2 font-display">
              Тип Каналу
            </label>
            <div className="grid grid-cols-2 gap-3 font-display">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`glass-panel p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
                  type === 'text' 
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold glow-active' 
                    : 'text-white/40 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Hash className="w-5 h-5" />
                <span className="text-xs">Текстовий</span>
              </button>

              <button
                type="button"
                onClick={() => setType('voice')}
                className={`glass-panel p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
                  type === 'voice' 
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold glow-active' 
                    : 'text-white/40 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-xs">Голосовий</span>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2 font-display">
              Назва Каналу <span className="text-[var(--status-dnd)]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'text' ? 'наприклад: анонси / кодинг' : 'наприклад: Голосова кімната 2'}
              className="glass-panel border-white/10 text-white h-11 px-4 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 placeholder:text-white/20"
              required
            />
          </div>

          <div className="pt-4 flex justify-between items-center glass-panel -mx-6 -mb-6 p-4 px-6 border-t-0 border-r-0 border-l-0 rounded-none font-display" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-white/60 hover:text-white hover:underline transition-colors"
            >
              Скасувати
            </button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white px-6 py-2 rounded-xl font-semibold shadow-md glow-active transition-all disabled:opacity-30 border-0"
            >
              Створити
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
