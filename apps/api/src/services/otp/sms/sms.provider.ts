/** Contract every SMS provider (mock, MSG91, Twilio...) implements. */
export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<void>;
}
