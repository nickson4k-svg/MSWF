'use client';

import { useState, memo } from 'react';
import { Send, Reply, X, Timer, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface ChatInputProps {
  inputText: string;
  replyTo: { sender: string; text: string } | null;
  selectedTtl: number;
  isRecordingVoice: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onCancelReply: () => void;
  onSelectTtl: (ttl: number) => void;
  onStartVoiceRecording: () => void;
  onStopVoiceRecording: () => void;
}

const TTL_OPTIONS = [
  { label: 'Без TTL', value: 0 },
  { label: '10 сек', value: 10 },
  { label: '1 хв', value: 60 },
  { label: '5 хв', value: 300 },
  { label: '1 день', value: 86400 },
];

export const ChatInput = memo(function ChatInput({
  inputText,
  replyTo,
  selectedTtl,
  isRecordingVoice,
  inputRef,
  onInputChange,
  onSendMessage,
  onCancelReply,
  onSelectTtl,
  onStartVoiceRecording,
  onStopVoiceRecording,
}: ChatInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTtlPicker, setShowTtlPicker] = useState(false);

  return (
    <footer className="p-3 sm:p-6 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/60 z-10" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-4 py-2 bg-zinc-900/80 rounded-xl border border-zinc-800/50 max-w-4xl mx-auto animate-slide-up">
          <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-blue-400 font-semibold">{replyTo.sender}</span>
            <p className="text-xs text-zinc-400 truncate">{replyTo.text}</p>
          </div>
          <button onClick={onCancelReply} className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <form onSubmit={onSendMessage} className="w-full flex gap-2 sm:gap-4 max-w-4xl mx-auto items-center relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTtlPicker(!showTtlPicker)}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${selectedTtl > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-900/80 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            title="Самознищення"
          >
            <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          {showTtlPicker && (
            <div className="absolute bottom-14 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-20 animate-slide-up min-w-[120px]">
              {TTL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onSelectTtl(opt.value); setShowTtlPicker(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedTtl === opt.value ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${showEmojiPicker ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-900/80 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            title="Емодзі"
          >
            <span className="text-xl">😀</span>
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-14 left-0 z-20 animate-slide-up shadow-2xl">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  onInputChange({ target: { value: inputText + emojiData.emoji } } as React.ChangeEvent<HTMLInputElement>);
                  setShowEmojiPicker(false);
                  inputRef.current?.focus();
                }}
                theme={Theme.DARK}
                searchPlaceHolder="Пошук емодзі..."
              />
            </div>
          )}
        </div>

        <Input
          ref={inputRef}
          value={inputText}
          onChange={onInputChange}
          placeholder="Напишіть повідомлення..."
          className="flex-1 bg-zinc-900/80 border-zinc-700/50 text-zinc-100 h-12 sm:h-14 pl-4 sm:pl-5 pr-12 sm:pr-14 rounded-full focus-visible:ring-1 focus-visible:ring-blue-500/50 shadow-inner text-[14px] sm:text-[15px] placeholder:text-zinc-500"
        />
        <div className="absolute right-1 sm:right-1.5 flex items-center gap-1">
          {inputText.trim() ? (
            <Button
              type="submit"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center p-0 shadow-md"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={isRecordingVoice ? onStopVoiceRecording : onStartVoiceRecording}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full transition-all flex items-center justify-center p-0 shadow-md ${isRecordingVoice ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
              title={isRecordingVoice ? "Зупинити запис" : "Голосове повідомлення"}
            >
              {isRecordingVoice ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
          )}
        </div>
      </form>
    </footer>
  );
});
