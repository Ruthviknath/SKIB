import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { imageUpload } from '../../services/storage/storage.service';
import { createRatingSchema, createStorySchema } from './memories.schemas';
import * as memoriesService from './memories.service';

const router = Router();
router.use(requireAuth);

router.get('/stories', async (req, res) => {
  const cityId = typeof req.query.cityId === 'string' ? req.query.cityId : undefined;
  const planId = typeof req.query.planId === 'string' ? req.query.planId : undefined;
  const stories = await memoriesService.listStories(cityId, planId);
  res.json({ stories });
});

router.post('/stories', imageUpload.single('photo'), async (req, res) => {
  const parsed = createStorySchema.parse(req.body ?? {});
  const story = await memoriesService.createStory(getUserId(req), parsed, req.file);
  res.status(201).json({ story });
});

router.post('/ratings', validateBody(createRatingSchema), async (req, res) => {
  const rating = await memoriesService.rateAttendee(getUserId(req), req.body);
  res.status(201).json({ rating });
});

router.get('/ratings/:userId', async (req, res) => {
  const data = await memoriesService.listUserRatings(String(req.params.userId));
  res.json(data);
});

export default router;
