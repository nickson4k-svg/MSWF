'use client';

import { ShaderType } from '@/components/ui/ShaderBackground';
import { saveRoomTheme, saveRoomShader } from '@/lib/db';

interface ThemePickerModalProps {
  roomId: string;
  theme: string;
  shaderType: ShaderType;
  onThemeChange: (theme: string) => void;
  onShaderChange: (shader: ShaderType) => void;
  onClose: () => void;
}

const COLOR_THEMES = [
  { id: 'default', name: 'Стандартна', color: 'bg-zinc-800' },
  { id: 'ocean', name: 'Океан', color: 'bg-blue-600' },
  { id: 'cyberpunk', name: 'Кіберпанк', color: 'bg-fuchsia-600' },
  { id: 'forest', name: 'Ліс', color: 'bg-emerald-600' },
  { id: 'rose', name: 'Троянда', color: 'bg-rose-600' },
];

const SHADER_OPTIONS: { id: ShaderType; name: string }[] = [
  { id: 'fluid', name: '🌊 WebGL Флюїд' },
  { id: 'grain-corners', name: '🌾 Grain Corners' },
  { id: 'grain-wave', name: '〰️ Grain Wave' },
  { id: 'grain-blob', name: '🫧 Grain Blob' },
];

export function ThemePickerModal({
  roomId,
  theme,
  shaderType,
  onThemeChange,
  onShaderChange,
}: ThemePickerModalProps) {
  return (
    <div className="absolute right-4 top-16 w-56 bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl p-3 z-50 animate-fade-in flex flex-col gap-3 max-h-[80vh] overflow-y-auto backdrop-blur-xl">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 px-1">Кольорова схема</p>
        <div className="flex flex-col gap-0.5">
          {COLOR_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onThemeChange(t.id);
                saveRoomTheme(roomId, t.id);
                fetch('/api/messages/theme', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ roomId, theme: t.id }),
                });
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-zinc-800/80 ${theme === t.id ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800/80 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 px-1">Стиль Шейдера</p>
        <div className="flex flex-col gap-0.5">
          {SHADER_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onShaderChange(s.id);
                saveRoomShader(roomId, s.id);
              }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-zinc-800/80 ${shaderType === s.id ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/30' : 'text-zinc-400'}`}
            >
              <span>{s.name}</span>
              {shaderType === s.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
