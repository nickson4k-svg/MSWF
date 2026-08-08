'use client';

import { useState } from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#313338] border border-[#383a40] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 text-center relative border-b border-[#383a40]">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[#949ba4] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white tracking-tight">Створити свою спільноту</h2>
          <p className="text-sm text-[#949ba4] mt-1">
            Ваш сервер — це місце, де ви з друзями спілкуєтеся у голосових та текстових каналах.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2">
              Назва сервера <span className="text-red-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Наркомани / Геймери"
              className="bg-[#1e1f22] border-none text-white h-11 px-4 rounded-lg focus-visible:ring-1 focus-visible:ring-[#5865f2] placeholder:text-[#6d6f78]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#5865f2]" />
              URL Аватарки сервера (опціонально)
            </label>
            <Input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="bg-[#1e1f22] border-none text-white h-11 px-4 rounded-lg focus-visible:ring-1 focus-visible:ring-[#5865f2] placeholder:text-[#6d6f78]"
            />
          </div>

          <div className="pt-4 flex justify-between items-center bg-[#2b2d31] -mx-6 -mb-6 p-4 px-6 border-t border-[#383a40]">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-white hover:underline"
            >
              Скасувати
            </button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all disabled:opacity-50"
            >
              Створити
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
