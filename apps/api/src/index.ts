import http from 'node:http';
import { createApp } from './app';
import { config } from './lib/config';
import { attachSocketServer } from './services/realtime/socket.service';

const app = createApp();
const server = http.createServer(app);
attachSocketServer(server);

server.listen(config.port, () => {
  console.log(`SKIB API + Socket.IO listening on http://localhost:${config.port} (sms: ${config.sms.provider})`);
});
