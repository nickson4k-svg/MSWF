import { redis } from './redis';

export interface FriendProfile {
  username: string;
  displayName: string;
  avatar: string;
  createdAt: string;
}

export interface FriendWithStatus extends FriendProfile {
  isOnline: boolean;
  lastSeen?: string;
  unreadCount?: number; // Feature 6: unread badge
}

export function getPrivateRoomId(user1: string, user2: string) {
  const sorted = [user1, user2].sort();
  return `private-${sorted.join('-')}`;
}

export async function isFriend(username1: string, username2: string): Promise<boolean> {
  return await redis.sismember(`friends:${username1}`, username2) === 1;
}

export async function getProfile(username: string): Promise<FriendProfile | null> {
  const data = await redis.hgetall(`profile:${username}`);
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as FriendProfile;
}
