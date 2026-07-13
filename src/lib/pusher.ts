import PusherClient from 'pusher-js';

// Client-side Pusher instance
export const getPusherClient = () => {
  if (typeof window === 'undefined') return null;
  
  return new PusherClient(
    process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
    {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    }
  );
};
