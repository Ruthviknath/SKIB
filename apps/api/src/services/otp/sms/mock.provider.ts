import type { SmsProvider } from './sms.provider';

/** Dev-only provider: logs the SMS instead of sending it. */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';

  async send(to: string, message: string): Promise<void> {
    if (process.env.NODE_ENV !== 'test') console.log(`[mock-sms] -> ${to}: ${message}`);
  }
}
