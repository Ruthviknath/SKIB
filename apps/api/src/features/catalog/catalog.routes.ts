import { Router } from 'express';
import { prisma } from '../../lib/prisma';

/** Public reference data used by onboarding (and later plan filters). */
const router = Router();

router.get('/cities', async (_req, res) => {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, state: true },
  });
  res.json({ cities });
});

router.get('/interests', async (_req, res) => {
  const interests = await prisma.interest.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, category: true },
  });
  res.json({ interests });
});

export default router;
