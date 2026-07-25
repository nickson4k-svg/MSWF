import ChatRoomClient from './ChatRoomClient';
import { normalizeRoomId } from '@/lib/friends';

export default async function ChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId: rawRoomId } = await params;
  const roomId = normalizeRoomId(rawRoomId);

  // Без бази даних історія завжди порожня при завантаженні сторінки
  const initialMessages: never[] = [];

  return <ChatRoomClient roomId={roomId} initialHistory={initialMessages} />;
}
