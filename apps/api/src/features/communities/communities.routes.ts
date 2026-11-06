import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createCommunityPostSchema, createCommunitySchema } from './communities.schemas';
import * as communitiesService from './communities.service';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const cityId = typeof req.query.cityId === 'string' ? req.query.cityId : undefined;
  const communities = await communitiesService.listCommunities(getUserId(req), cityId);
  res.json({ communities });
});

router.post('/', validateBody(createCommunitySchema), async (req, res) => {
  const community = await communitiesService.createCommunity(getUserId(req), req.body);
  res.status(201).json({ community });
});

router.get('/:communityId', async (req, res) => {
  const community = await communitiesService.getCommunity(getUserId(req), String(req.params.communityId));
  res.json({ community });
});

router.post('/:communityId/join', async (req, res) => {
  const community = await communitiesService.joinCommunity(getUserId(req), String(req.params.communityId));
  res.json({ community });
});

router.delete('/:communityId/join', async (req, res) => {
  const community = await communitiesService.leaveCommunity(getUserId(req), String(req.params.communityId));
  res.json({ community });
});

router.post('/:communityId/posts', validateBody(createCommunityPostSchema), async (req, res) => {
  const post = await communitiesService.createPost(
    getUserId(req),
    String(req.params.communityId),
    req.body.body,
  );
  res.status(201).json({ post });
});

export default router;
