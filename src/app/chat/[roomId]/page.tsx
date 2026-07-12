import { redis } from '@/lib/redis';
import ChatRoomClient from './ChatRoomClient';

export default async function ChatPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;
  
  // Fetch initial messages from Redis
  const redisKey = `chat:room:${roomId}:messages`;
  let initialMessages: any[] = [];
  
  try {
    const rawMessages = await redis.lrange(redisKey, 0, -1);
    initialMessages = rawMessages.map(msg => typeof msg === 'string' ? JSON.parse(msg) : msg);
  } catch (error) {
    console.error("Failed to fetch history:", error);
  }

  return <ChatRoomClient roomId={roomId} initialHistory={initialMessages} />;
}
