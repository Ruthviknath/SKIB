import { config } from '../../../lib/config';
import { MockSmsProvider } from './mock.provider';
import type { SmsProvider } from './sms.provider';

export type { SmsProvider };

export function createSmsProvider(): SmsProvider {
  switch (config.sms.provider) {
    case 'mock':
      if (config.isProd) throw new Error('SMS_PROVIDER=mock is not allowed in production');
      return new MockSmsProvider();
    // case 'msg91': return new Msg91SmsProvider(...)   <- add when API keys are available
    // case 'twilio': return new TwilioSmsProvider(...)
    default:
      throw new Error(`Unknown SMS_PROVIDER "${config.sms.provider}"`);
  }
}
