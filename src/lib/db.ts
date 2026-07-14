import Dexie, { type EntityTable } from 'dexie';

// Feature 12: Local cache for messages using IndexedDB via Dexie.js

export interface CachedMessage {
  id: string;
  text: string;
  roomId: string;
  sender: string;
  timestamp: number;
  replyTo?: string;
  readBy?: string[];
  ttl?: number;
}

class NexusChatDB extends Dexie {
  messages!: EntityTable<CachedMessage, 'id'>;

  constructor() {
    super('NexusChatDB');
    this.version(1).stores({
      messages: 'id, roomId, timestamp',
    });
  }
}

export const db = new NexusChatDB();

/** Save messages to local cache */
export async function cacheMessages(msgs: CachedMessage[]) {
  try {
    await db.messages.bulkPut(msgs);
  } catch (e) {
    console.warn('Failed to cache messages:', e);
  }
}

/** Get cached messages for a room, ordered by timestamp */
export async function getCachedMessages(roomId: string): Promise<CachedMessage[]> {
  try {
    return await db.messages
      .where('roomId')
      .equals(roomId)
      .sortBy('timestamp');
  } catch (e) {
    console.warn('Failed to get cached messages:', e);
    return [];
  }
}

/** Remove expired TTL messages from cache */
export async function cleanExpiredMessages() {
  try {
    const now = Date.now();
    const allMsgs = await db.messages.toArray();
    const expired = allMsgs.filter(m => m.ttl && (m.timestamp + m.ttl * 1000) < now);
    if (expired.length > 0) {
      await db.messages.bulkDelete(expired.map(m => m.id));
    }
  } catch (e) {
    console.warn('Failed to clean expired messages:', e);
  }
}
