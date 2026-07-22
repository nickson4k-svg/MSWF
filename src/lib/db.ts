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

export interface RoomSettings {
  roomId: string;
  theme?: string;
  shaderType?: string;
}

class NexusChatDB extends Dexie {
  messages!: EntityTable<CachedMessage, 'id'>;
  settings!: EntityTable<RoomSettings, 'roomId'>;

  constructor() {
    super('NexusChatDB');
    this.version(2).stores({
      messages: 'id, roomId, timestamp',
      settings: 'roomId',
    });
  }
}

export const db = new NexusChatDB();

/** Save messages to local cache */
export async function cacheMessages(msgs: CachedMessage[]) {
  try {
    await db.messages.bulkPut(msgs);
  } catch (err) {
    console.warn('Failed to cache messages:', err);
  }
}

/** Get cached messages for a room, ordered by timestamp */
export async function getCachedMessages(roomId: string): Promise<CachedMessage[]> {
  try {
    return await db.messages
      .where('roomId')
      .equals(roomId)
      .sortBy('timestamp');
  } catch (err) {
    console.warn('Failed to get cached messages:', err);
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
  } catch (err) {
    console.warn('Failed to clean expired messages:', err);
  }
}

export async function saveRoomTheme(roomId: string, theme: string) {
  try {
    const current = await db.settings.get(roomId);
    await db.settings.put({ ...current, roomId, theme });
  } catch (err) {
    console.warn('Failed to save room theme:', err);
  }
}

export async function getRoomTheme(roomId: string): Promise<string> {
  try {
    const setting = await db.settings.get(roomId);
    return setting?.theme || 'default';
  } catch {
    return 'default';
  }
}

export async function saveRoomShader(roomId: string, shaderType: string) {
  try {
    const current = await db.settings.get(roomId);
    await db.settings.put({ ...current, roomId, shaderType });
  } catch (err) {
    console.warn('Failed to save room shader:', err);
  }
}

export async function getRoomShader(roomId: string): Promise<string> {
  try {
    const setting = await db.settings.get(roomId);
    return setting?.shaderType || 'fluid';
  } catch {
    return 'fluid';
  }
}
