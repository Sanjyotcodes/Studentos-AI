// HTTP server entry point: reads config, starts the Express app listening.
import dns from 'node:dns';
import { createApp } from './app';
import { env } from './config/env';

// Node (17+) resolves DNS in whatever order the OS resolver returns records,
// which on some networks puts a broken/blackholed IPv6 route ahead of a
// perfectly working IPv4 one — every outbound connection (e.g. to a hosted
// Postgres like Neon) then hangs on the dead IPv6 address until it times out,
// even though IPv4 to the same host succeeds instantly. Forcing IPv4-first
// resolution sidesteps that dead route entirely; it's a no-op on networks
// where IPv6 already works fine.
dns.setDefaultResultOrder('ipv4first');

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`StudentOS AI backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});
