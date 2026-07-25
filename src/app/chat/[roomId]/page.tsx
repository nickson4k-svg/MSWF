import ChatRoomClient from './ChatRoomClient';
import { normalizeRoomId } from '@/lib/friends';
import { redis } from '@/lib/redis';
import { Message } from '@/components/chat/ChatMessageItem';

export default async function ChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId: rawRoomId } = await params;
  const roomId = normalizeRoomId(rawRoomId);

  let initialMessages: Message[] = [];
  try {
    const rawStrs = await redis.lrange(`messages:${roomId}`, -500, -1);
    if (rawStrs && rawStrs.length > 0) {
      initialMessages = rawStrs.map(s => JSON.parse(s));
    }
  } catch (e) {
    console.warn('Failed to fetch initial history from server:', e);
  }

  return <ChatRoomClient roomId={roomId} initialHistory={initialMessages} />;
}
