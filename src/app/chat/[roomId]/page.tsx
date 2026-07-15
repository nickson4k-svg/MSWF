import ChatRoomClient from './ChatRoomClient';

export default async function ChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  // Без бази даних історія завжди порожня при завантаженні сторінки
  const initialMessages: never[] = [];

  return <ChatRoomClient roomId={roomId} initialHistory={initialMessages} />;
}
