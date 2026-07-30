import PusherClient from 'pusher-js';

// Sanitize roomId for use as a Pusher channel name
// Pusher only allows: a-z A-Z 0-9 _ - = @ , . ; /
// Replace invalid characters (like colons) with dashes
export const sanitizeChannelName = (name: string) => {
  return name.replace(/:/g, '--');
};

// Client-side Pusher singleton instance
let pusherInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (typeof window === 'undefined') return null;
  
  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      }
    );
  }
  return pusherInstance;
};
