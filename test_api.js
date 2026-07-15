/* eslint-disable */
const { SignJWT } = require('jose');

async function run() {
  const secret = new TextEncoder().encode('fallback-secret-for-development-only');
  const token = await new SignJWT({ sub: 'NK2', pwdHash: 'test' })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);

  const res = await fetch('http://localhost:3000/api/friends/requests', {
    headers: {
      cookie: `auth_token=${token}`
    }
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
run().catch(console.error);
