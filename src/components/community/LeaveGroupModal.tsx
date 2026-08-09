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
          
          <div className="w-12 h-12 rounded-2xl bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 text-[var(--status-dnd)] flex items-center justify-center mx-auto mb-3" style={{ boxShadow: '0 0 16px rgba(251,113,133,0.2)' }}>
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight font-display">Вийти з групи?</h2>
          <p className="text-xs text-white/50 mt-1">
            Ви справді бажаєте залишити групу <span className="text-white font-semibold">&ldquo;{groupName}&rdquo;</span>?
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-white/60 leading-relaxed glass-panel p-3.5 rounded-2xl">
            Після виходу ви втратите доступ до текстових каналів, медіафайлів та голосових кімнат цієї спільноти. Повторне приєднання можливе за посиланням-запрошенням.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 font-display">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl text-xs"
            >
              Скасувати
            </Button>

            <Button
              type="button"
              onClick={onConfirmLeave}
              className="bg-[var(--status-dnd)] hover:bg-[var(--status-dnd)]/80 text-white px-5 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5 border-0"
              style={{ boxShadow: '0 0 16px rgba(251,113,133,0.3)' }}
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
