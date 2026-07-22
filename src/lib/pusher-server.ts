import Pusher from 'pusher';

// Singleton Pusher server instance — replaces 10+ duplicate instantiations across API routes
let pusherServerInstance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServerInstance) {
    pusherServerInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID || 'dummy_id',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
      secret: process.env.PUSHER_SECRET || 'dummy_secret',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      useTLS: true,
    });
  }
  return pusherServerInstance;
}
