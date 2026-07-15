/* eslint-disable */
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: 'https://neutral-eel-145432.upstash.io',
  token: 'gQAAAAAAAjgYAAIgcDFhMGJhZDhhMTU3MjI0ZjgxYTk3Mzg5Y2Q0M2IyOWZkMA',
});
async function run() {
  const keys = await redis.keys('*');
  console.log('All Keys:', keys);
  
  for (const key of keys) {
    if (key.startsWith('friend_requests') || key.startsWith('sent_requests') || key.startsWith('friends')) {
       console.log(key, await redis.smembers(key));
    }
    if (key.startsWith('profile:')) {
       console.log(key, await redis.hgetall(key));
    }
  }
}
run().catch(console.error);
