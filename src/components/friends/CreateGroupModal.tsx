'use client';

import { useState } from 'react';
import { X, Users, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreateGroup: (name: string, iconUrl?: string) => void;
}

export function CreateGroupModal({ onClose, onCreateGroup }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateGroup(name.trim(), iconUrl.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 text-center relative border-b border-zinc-800/80 bg-zinc-950/60">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-2">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Створити нову групу</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Створіть груповий чат або спільноту для спілкування з кількома друзями.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Назва групи <span className="text-red-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Команда PUBG / Наркомани"
              className="bg-zinc-950/50 border-zinc-800 text-white h-11 px-4 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              URL Іконки групи (опціонально)
            </label>
            <Input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/group-icon.png"
              className="bg-zinc-950/50 border-zinc-800 text-white h-11 px-4 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-zinc-600"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl font-medium shadow-md transition-all disabled:opacity-50"
            >
              Створити групу
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
