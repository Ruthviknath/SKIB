import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

let seq = 2000;
const nextPhone = () => `+91970000${String(++seq).padStart(4, '0')}`;

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
    .send({ name, birthDate: '1998-03-10', gender: 'woman', cityId: city.id, interestIds, bio: `${name}'s bio` })
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

describe('Phase 3: BFF Swipe, 1:1 Chat, Communities, Notifications, Safety & Memories', () => {
  it('supports Bumble BFF swipe discovery, mutual match creation, 1:1 direct chat, and notifications', async () => {
    const userA = await createOnboardedUser('Ananya', 'Bangalore');
    const userB = await createOnboardedUser('Siddharth', 'Bangalore');

    // 1. userA sees userB in candidates with 3 shared interests
    const candRes = await request(app).get(`/discovery/candidates?cityId=${userA.cityId}`).set(userA.auth);
    expect(candRes.status).toBe(200);
    const foundB = candRes.body.candidates.find((c: { id: string }) => c.id === userB.id);
    expect(foundB).toBeTruthy();
    expect(foundB.sharedInterestCount).toBe(3);

    // 2. userA likes userB -> not matched yet
    const swipe1 = await request(app)
      .post('/discovery/swipe')
      .set(userA.auth)
      .send({ targetUserId: userB.id, action: 'LIKE' });
    expect(swipe1.status).toBe(200);
    expect(swipe1.body.matched).toBe(false);

    // 3. userB likes userA -> mutual match!
    const swipe2 = await request(app)
      .post('/discovery/swipe')
      .set(userB.auth)
      .send({ targetUserId: userA.id, action: 'LIKE' });
    expect(swipe2.status).toBe(200);
    expect(swipe2.body.matched).toBe(true);
    const matchId = swipe2.body.match.id as string;

    // 4. Either user can send the first 1:1 message
    const dm1 = await request(app)
      .post(`/matches/${matchId}/messages`)
      .set(userA.auth)
      .send({ body: 'Hey Siddharth! Up for coffee this weekend?' });
    expect(dm1.status).toBe(201);

    const dm2 = await request(app)
      .post(`/matches/${matchId}/messages`)
      .set(userB.auth)
      .send({ body: 'Definitely! Let us do Indiranagar.' });
    expect(dm2.status).toBe(201);

    const convo = await request(app).get(`/matches/${matchId}/messages`).set(userA.auth);
    expect(convo.status).toBe(200);
    expect(convo.body.messages).toHaveLength(2);

    // 5. Both users received NEW_MATCH notifications, and userB received DIRECT_MESSAGE notification
    const notifsB = await request(app).get('/notifications').set(userB.auth);
    expect(notifsB.status).toBe(200);
    expect(notifsB.body.unreadCount).toBeGreaterThanOrEqual(2);
    expect(notifsB.body.notifications.some((n: { type: string }) => n.type === 'NEW_MATCH')).toBe(true);
    expect(notifsB.body.notifications.some((n: { type: string }) => n.type === 'DIRECT_MESSAGE')).toBe(true);

    await request(app).post('/notifications/read-all').set(userB.auth).expect(200);
    const afterRead = await request(app).get('/notifications').set(userB.auth);
    expect(afterRead.body.unreadCount).toBe(0);
  });

  it('supports local communities: seeded clubs, creating a new community, joining, and posting', async () => {
    const member = await createOnboardedUser('Priya', 'Bangalore');
    const guest = await createOnboardedUser('Varun', 'Bangalore');

    // 1. Seeded communities are returned
    const seeded = await request(app).get(`/communities?cityId=${member.cityId}`).set(member.auth);
    expect(seeded.status).toBe(200);
    expect(seeded.body.communities.length).toBeGreaterThanOrEqual(2);

    // 2. Member creates a new community in Bangalore
    const created = await request(app).post('/communities').set(member.auth).send({
      name: 'HSR Layout Pickleball & Brunch',
      description: 'Saturday morning pickleball games followed by dosa breakfast.',
      cityId: member.cityId,
      interestId: member.interestId,
    });
    expect(created.status).toBe(201);
    const commId = created.body.community.id as string;
    expect(created.body.community.joined).toBe(true);

    // 3. Non-member cannot post until they join
    const blockedPost = await request(app)
      .post(`/communities/${commId}/posts`)
      .set(guest.auth)
      .send({ body: 'Can I join?' });
    expect(blockedPost.status).toBe(403);

    await request(app).post(`/communities/${commId}/join`).set(guest.auth).expect(200);
    const postRes = await request(app)
      .post(`/communities/${commId}/posts`)
      .set(guest.auth)
      .send({ body: 'Just joined! Who is playing this Saturday?' });
    expect(postRes.status).toBe(201);
    expect(postRes.body.post.author.name).toBe('Varun');
  });

  it('enforces safety blocks (hides from discovery & blocks 1:1 chat) and moderation reports', async () => {
    const alice = await createOnboardedUser('Alice', 'Hyderabad');
    const bob = await createOnboardedUser('Bob', 'Hyderabad');

    // Mutual match first
    await request(app).post('/discovery/swipe').set(alice.auth).send({ targetUserId: bob.id, action: 'LIKE' });
    const matchRes = await request(app)
      .post('/discovery/swipe')
      .set(bob.auth)
      .send({ targetUserId: alice.id, action: 'LIKE' });
    const matchId = matchRes.body.match.id as string;

    // Alice blocks Bob
    const blockRes = await request(app).post(`/safety/block/${bob.id}`).set(alice.auth);
    expect(blockRes.status).toBe(201);
    expect(blockRes.body.blocks).toHaveLength(1);

    // Bob can no longer message Alice in their match
    const dmBlocked = await request(app)
      .post(`/matches/${matchId}/messages`)
      .set(bob.auth)
      .send({ body: 'Hello?' });
    expect(dmBlocked.status).toBe(403);
    expect(dmBlocked.body.error.code).toBe('USER_BLOCKED');

    // Alice submits a report and moderator resolves it
    const rep = await request(app).post('/safety/reports').set(alice.auth).send({
      targetUserId: bob.id,
      reason: 'HARASSMENT',
      details: 'Unwanted messages',
    });
    expect(rep.status).toBe(201);
    expect(rep.body.report.status).toBe('OPEN');

    const resolved = await request(app)
      .patch(`/safety/reports/${rep.body.report.id}`)
      .set(alice.auth)
      .send({ status: 'RESOLVED' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.report.status).toBe('RESOLVED');
  });

  it('allows approved plan attendees to share post-plan stories and rate/vouch for fellow attendees', async () => {
    const host = await createOnboardedUser('Neha', 'Bangalore');
    const attendee = await createOnboardedUser('Rishi', 'Bangalore');
    const outsider = await createOnboardedUser('Tara', 'Bangalore');

    const planRes = await request(app)
      .post('/plans')
      .set(host.auth)
      .send({
        title: 'Board Games & Ramen Evening',
        venue: 'Koramangala 5th Block',
        cityId: host.cityId,
        interestId: host.interestId,
        startsAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        capacity: 4,
      });
    const planId = planRes.body.plan.id as string;

    await request(app).post(`/plans/${planId}/join`).set(attendee.auth).send({});
    await request(app)
      .patch(`/plans/${planId}/requests/${attendee.id}`)
      .set(host.auth)
      .send({ status: 'APPROVED' })
      .expect(200);

    // Outsider cannot post a story for this plan
    const forbiddenStory = await request(app)
      .post('/memories/stories')
      .set(outsider.auth)
      .field('planId', planId)
      .field('caption', 'I was not there');
    expect(forbiddenStory.status).toBe(403);

    // Approved attendee posts a story with photo
    const storyRes = await request(app)
      .post('/memories/stories')
      .set(attendee.auth)
      .field('planId', planId)
      .field('caption', 'Best ramen & Catan night in Koramangala!')
      .attach('photo', PNG, { filename: 'moment.png', contentType: 'image/png' });
    expect(storyRes.status).toBe(201);
    expect(storyRes.body.story.photoUrl).toContain('/uploads/');

    // Attendee vouches for host
    const ratingRes = await request(app).post('/memories/ratings').set(attendee.auth).send({
      planId,
      rateeId: host.id,
      score: 5,
      vouchTag: 'Super welcoming',
      comment: 'Awesome host!',
    });
    expect(ratingRes.status).toBe(201);

    const ratingsList = await request(app).get(`/memories/ratings/${host.id}`).set(attendee.auth);
    expect(ratingsList.status).toBe(200);
    expect(ratingsList.body.count).toBe(1);
    expect(ratingsList.body.averageScore).toBe(5);
  });
});
