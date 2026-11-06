import { Router } from 'express';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { getUserId, requireAuth } from '../../middleware/auth';
import { getProfile } from '../profile/profile.service';

const router = Router();
router.use(requireAuth);

router.get('/status', async (req, res) => {
  const { onboarding } = await getProfile(getUserId(req));
  res.json(onboarding);
});

/** Marks onboarding complete once all required steps are done. Idempotent. */
router.post('/complete', async (req, res) => {
  const userId = getUserId(req);
  const profile = await getProfile(userId);
  if (profile.onboarding.missing.length > 0) {
    throw new AppError(400, 'ONBOARDING_INCOMPLETE', 'Please complete all onboarding steps', {
      missing: profile.onboarding.missing,
    });
  }
  if (!profile.onboarding.completed) {
    await prisma.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } });
  }
  res.json({ profile: await getProfile(userId) });
});

export default router;
