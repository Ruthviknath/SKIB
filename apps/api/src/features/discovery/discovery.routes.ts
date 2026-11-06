import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { swipeSchema } from './discovery.schemas';
import * as discoveryService from './discovery.service';

const router = Router();
router.use(requireAuth);

router.get('/candidates', async (req, res) => {
  const cityId = typeof req.query.cityId === 'string' ? req.query.cityId : undefined;
  const candidates = await discoveryService.listCandidates(getUserId(req), cityId);
  res.json({ candidates });
});

router.post('/swipe', validateBody(swipeSchema), async (req, res) => {
  const result = await discoveryService.swipeCandidate(getUserId(req), req.body);
  res.json(result);
});

router.get('/matches', async (req, res) => {
  const matches = await discoveryService.listMatches(getUserId(req));
  res.json({ matches });
});

export default router;
