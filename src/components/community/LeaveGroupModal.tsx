'use client';

import { X, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaveGroupModalProps {
  isOpen: boolean;
  groupName: string;
  onClose: () => void;
  onConfirmLeave: () => void;
}

export function LeaveGroupModal({ isOpen, groupName, onClose, onConfirmLeave }: LeaveGroupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 text-center relative border-b border-zinc-800/80 bg-zinc-950/60">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">Вийти з групи?</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Ви справді бажаєте залишити групу <span className="text-zinc-100 font-semibold">&ldquo;{groupName}&rdquo;</span>?
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
            Після виходу ви втратите доступ до текстових каналів, медіафайлів та голосових кімнат цієї спільноти. Повторне приєднання можливе за посиланням-запрошенням.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl text-xs"
            >
              Скасувати
            </Button>

            <Button
              type="button"
              onClick={onConfirmLeave}
              className="bg-red-600 hover:bg-red-500 text-white px-5 rounded-xl text-xs font-semibold shadow-lg shadow-red-900/30 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Вийти з групи
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
