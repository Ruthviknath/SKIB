import { createApp } from './app';
import { config } from './lib/config';

createApp().listen(config.port, () => {
  console.log(`SKIB API listening on http://localhost:${config.port} (sms: ${config.sms.provider})`);
});
