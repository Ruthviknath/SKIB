import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();
// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

let phoneSeq = 0;
const newPhone = () => `+91900000${String(++phoneSeq).padStart(4, '0')}`;

async function login(phone = newPhone()) {
  const req = await request(app).post('/auth/otp/request').send({ phone });
  expect(req.status).toBe(200);
  const res = await request(app).post('/auth/otp/verify').send({ phone, code: req.body.devCode });
  expect(res.status).toBe(200);
  return { phone, token: res.body.token as string, body: res.body };
}

describe('auth (phone OTP)', () => {
  it('rejects an invalid phone number', async () => {
    const res = await request(app).post('/auth/otp/request').send({ phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('normalises phone formatting and returns a dev code', async () => {
    const res = await request(app).post('/auth/otp/request').send({ phone: '+91 98765-43210' });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+919876543210');
    expect(res.body.devCode).toMatch(/^\d{6}$/);
  });

  it('enforces resend cooldown', async () => {
    const phone = newPhone();
    await request(app).post('/auth/otp/request').send({ phone }).expect(200);
    const res = await request(app).post('/auth/otp/request').send({ phone });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_COOLDOWN');
  });

  it('rejects wrong codes, accepts the right one once, and blocks reuse', async () => {
    const phone = newPhone();
    const { body } = await request(app).post('/auth/otp/request').send({ phone });
    const wrong = body.devCode === '000000' ? '111111' : '000000';

    const bad = await request(app).post('/auth/otp/verify').send({ phone, code: wrong });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('OTP_INVALID');
    expect(bad.body.error.details.attemptsLeft).toBe(4);

    const ok = await request(app).post('/auth/otp/verify').send({ phone, code: body.devCode });
    expect(ok.status).toBe(200);
    expect(ok.body.isNewUser).toBe(true);
    expect(ok.body.token).toBeTruthy();

    const reuse = await request(app).post('/auth/otp/verify').send({ phone, code: body.devCode });
    expect(reuse.body.error.code).toBe('OTP_EXPIRED');
  });

  it('protects private routes', async () => {
    expect((await request(app).get('/profile/me')).status).toBe(401);
    expect((await request(app).get('/profile/me').set('Authorization', 'Bearer nope')).status).toBe(401);
  });
});

describe('onboarding', () => {
  it('walks a new user through every step to completion', async () => {
    const { token, phone, body } = await login();
    const auth = { Authorization: `Bearer ${token}` };
    expect(body.profile.onboarding).toMatchObject({ completed: false, missing: ['basics', 'city', 'interests', 'photos'] });

    // basics
    const underage = await request(app).patch('/profile/me').set(auth).send({ name: 'Asha', birthDate: '2015-01-01', gender: 'woman' });
    expect(underage.body.error.code).toBe('UNDERAGE');
    const basics = await request(app).patch('/profile/me').set(auth).send({ name: 'Asha', birthDate: '1998-05-20', gender: 'woman' });
    expect(basics.status).toBe(200);
    expect(basics.body.profile.age).toBeGreaterThanOrEqual(18);

    // city
    const { cities } = (await request(app).get('/catalog/cities')).body;
    const bangalore = cities.find((c: { name: string }) => c.name === 'Bangalore');
    expect((await request(app).patch('/profile/me').set(auth).send({ cityId: 'nope' })).body.error.code).toBe('INVALID_CITY');
    await request(app).patch('/profile/me').set(auth).send({ cityId: bangalore.id }).expect(200);

    // interests
    const { interests } = (await request(app).get('/catalog/interests')).body;
    const ids = interests.slice(0, 3).map((i: { id: string }) => i.id);
    expect((await request(app).patch('/profile/me').set(auth).send({ interestIds: ids.slice(0, 2) })).status).toBe(400);
    await request(app).patch('/profile/me').set(auth).send({ interestIds: ids, bio: 'New to Bangalore, love coffee.' }).expect(200);

    // can't complete without a photo
    const early = await request(app).post('/onboarding/complete').set(auth);
    expect(early.body.error).toMatchObject({ code: 'ONBOARDING_INCOMPLETE', details: { missing: ['photos'] } });

    // photos
    const badFile = await request(app).post('/profile/me/photos').set(auth).attach('photo', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(badFile.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    const photo = await request(app).post('/profile/me/photos').set(auth).attach('photo', PNG, { filename: 'me.png', contentType: 'image/png' });
    expect(photo.status).toBe(201);
    const url = photo.body.profile.photos[0].url;
    expect((await request(app).get(url)).status).toBe(200);

    // complete
    const done = await request(app).post('/onboarding/complete').set(auth);
    expect(done.status).toBe(200);
    expect(done.body.profile).toMatchObject({ name: 'Asha', city: { name: 'Bangalore' }, onboarding: { completed: true, missing: [] } });
    expect(done.body.profile.interests).toHaveLength(3);

    // post-onboarding rules
    expect((await request(app).patch('/profile/me').set(auth).send({ birthDate: '1990-01-01' })).body.error.code).toBe('BIRTHDATE_LOCKED');
    const photoId = done.body.profile.photos[0].id;
    expect((await request(app).delete(`/profile/me/photos/${photoId}`).set(auth)).body.error.code).toBe('PHOTO_MIN');

    // logging in again returns the same, onboarded user (after cooldown is bypassed by a fresh code window)
    const again = await request(app).get('/profile/me').set(auth);
    expect(again.body.profile.phone).toBe(phone);
  });

  it('deletes the account', async () => {
    const { token } = await login();
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).delete('/profile/me').set(auth)).status).toBe(204);
    expect((await request(app).get('/profile/me').set(auth)).status).toBe(401);
  });
});
