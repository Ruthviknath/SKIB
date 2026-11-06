import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

let seq = 500;
const nextPhone = () => `+91980000${String(++seq).padStart(4, '0')}`;

async function createOnboardedUser(name: string, cityName = 'Bangalore') {
  const phone = nextPhone();
  const otpReq = await request(app).post('/auth/otp/request').send({ phone });
  const verify = await request(app).post('/auth/otp/verify').send({ phone, code: otpReq.body.devCode });
  const token = verify.body.token as string;
  const auth = { Authorization: `Bearer ${token}` };

  const { cities } = (await request(app).get('/catalog/cities')).body;
  const city = cities.find((c: { name: string }) => c.name === cityName);
  const { interests } = (await request(app).get('/catalog/interests')).body;
  const interestIds = interests.slice(0, 3).map((i: { id: string }) => i.id);

  await request(app)
    .patch('/profile/me')
    .set(auth)
    .send({ name, birthDate: '1997-06-15', gender: 'woman', cityId: city.id, interestIds, bio: `${name}'s bio` })
    .expect(200);

  await request(app)
    .post('/profile/me/photos')
    .set(auth)
    .attach('photo', PNG, { filename: 'avatar.png', contentType: 'image/png' })
    .expect(201);

  const completed = await request(app).post('/onboarding/complete').set(auth).expect(200);
  return {
    id: completed.body.profile.id as string,
    token,
    auth,
    cityId: city.id as string,
    interestId: interestIds[0] as string,
  };
}

describe('Phase 2: Public Profiles, Plans, Host Approval & Group Chat', () => {
  it('returns public member profile without exposing phone number', async () => {
    const host = await createOnboardedUser('Kavya');
    const viewer = await createOnboardedUser('Nikhil');

    const res = await request(app).get(`/profile/${host.id}`).set(viewer.auth);
    expect(res.status).toBe(200);
    expect(res.body.profile.name).toBe('Kavya');
    expect(res.body.profile.phone).toBeUndefined();
    expect(res.body.profile.interests).toHaveLength(3);
  });

  it('hosts a plan, handles join request approval workflow, enforces capacity, and unlocks group chat', async () => {
    const host = await createOnboardedUser('Divya', 'Bangalore');
    const guest1 = await createOnboardedUser('Arjun', 'Bangalore');
    const guest2 = await createOnboardedUser('Zoya', 'Bangalore');

    const startsAt = new Date(Date.now() + 48 * 3600_000).toISOString();

    // 1. Host creates a plan with capacity 2 (host + 1 attendee)
    const createRes = await request(app).post('/plans').set(host.auth).send({
      title: 'Sunday Morning Cubbon Park Run & Coffee',
      description: 'Easy 5k pace followed by filter coffee.',
      venue: 'Cubbon Park Metro Exit',
      cityId: host.cityId,
      interestId: host.interestId,
      startsAt,
      capacity: 2,
    });
    expect(createRes.status).toBe(201);
    const planId = createRes.body.plan.id as string;
    expect(createRes.body.plan.spotsFilled).toBe(1);
    expect(createRes.body.plan.spotsLeft).toBe(1);
    expect(createRes.body.plan.myMembership).toMatchObject({ role: 'HOST', status: 'APPROVED' });

    // 2. Guest1 requests to join
    const joinRes = await request(app)
      .post(`/plans/${planId}/join`)
      .set(guest1.auth)
      .send({ note: 'Love running! Count me in.' });
    expect(joinRes.status).toBe(201);
    expect(joinRes.body.plan.myMembership).toMatchObject({ role: 'ATTENDEE', status: 'PENDING' });

    // 3. While PENDING, guest1 cannot access group chat
    const blockedChat = await request(app).get(`/plans/${planId}/messages`).set(guest1.auth);
    expect(blockedChat.status).toBe(403);
    expect(blockedChat.body.error.code).toBe('CHAT_FORBIDDEN');

    // 4. Host sees guest1 in pendingRequests and approves
    const hostPlanView = await request(app).get(`/plans/${planId}`).set(host.auth);
    expect(hostPlanView.body.plan.pendingRequests).toHaveLength(1);
    expect(hostPlanView.body.plan.pendingRequests[0].user.id).toBe(guest1.id);

    const approveRes = await request(app)
      .patch(`/plans/${planId}/requests/${guest1.id}`)
      .set(host.auth)
      .send({ status: 'APPROVED' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.plan.spotsFilled).toBe(2);
    expect(approveRes.body.plan.spotsLeft).toBe(0);

    // 5. Plan is now full (2/2), so guest2 cannot request to join
    const fullRes = await request(app).post(`/plans/${planId}/join`).set(guest2.auth).send({});
    expect(fullRes.status).toBe(400);
    expect(fullRes.body.error.code).toBe('PLAN_FULL');

    // 6. Approved guest1 and host exchange messages in the Plan Group Chat
    const msg1 = await request(app)
      .post(`/plans/${planId}/messages`)
      .set(host.auth)
      .send({ body: 'Welcome Arjun! See you at 7 AM.' });
    expect(msg1.status).toBe(201);

    const msg2 = await request(app)
      .post(`/plans/${planId}/messages`)
      .set(guest1.auth)
      .send({ body: 'Thanks Divya, excited!' });
    expect(msg2.status).toBe(201);

    const history = await request(app).get(`/plans/${planId}/messages`).set(guest1.auth);
    expect(history.status).toBe(200);
    expect(history.body.messages).toHaveLength(2);
    expect(history.body.messages[0].sender.name).toBe('Divya');
    expect(history.body.messages[1].sender.name).toBe('Arjun');

    // 7. Guest1 leaves the plan -> frees up 1 spot
    const leaveRes = await request(app).delete(`/plans/${planId}/join`).set(guest1.auth);
    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.plan.spotsFilled).toBe(1);
  });
});
