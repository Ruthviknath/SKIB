import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import planChatRoutes from '../plan-chat/plan-chat.routes';
import {
  createPlanSchema,
  joinPlanRequestSchema,
  reviewJoinRequestSchema,
  updatePlanSchema,
} from './plans.schemas';
import * as plansService from './plans.service';

const router = Router();
router.use(requireAuth);

// Browse plans with optional cityId, interestId, category, hostId, or mine=true filters
router.get('/', async (req, res) => {
  const userId = getUserId(req);
  const { cityId, interestId, category, hostId, mine } = req.query;
  const plans = await plansService.listPlans(
    {
      cityId: typeof cityId === 'string' ? cityId : undefined,
      interestId: typeof interestId === 'string' ? interestId : undefined,
      category: typeof category === 'string' ? category : undefined,
      hostId: typeof hostId === 'string' ? hostId : undefined,
      memberUserId: mine === 'true' ? userId : undefined,
    },
    userId,
  );
  res.json({ plans });
});

// Host a new plan
router.post('/', validateBody(createPlanSchema), async (req, res) => {
  const plan = await plansService.createPlan(getUserId(req), req.body);
  res.status(201).json({ plan });
});

// Get plan details (attendees, my membership, and pending requests if host)
router.get('/:planId', async (req, res) => {
  const plan = await plansService.getPlan(String(req.params.planId), getUserId(req));
  res.json({ plan });
});

// Host edits plan details
router.patch('/:planId', validateBody(updatePlanSchema), async (req, res) => {
  const plan = await plansService.updatePlan(getUserId(req), String(req.params.planId), req.body);
  res.json({ plan });
});

// Host cancels plan
router.post('/:planId/cancel', async (req, res) => {
  const plan = await plansService.cancelPlan(getUserId(req), String(req.params.planId));
  res.json({ plan });
});

// Request to join a plan (creates PENDING request for host approval)
router.post('/:planId/join', validateBody(joinPlanRequestSchema), async (req, res) => {
  const plan = await plansService.requestJoinPlan(getUserId(req), String(req.params.planId), req.body.note);
  res.status(201).json({ plan });
});

// Cancel pending join request or leave an approved spot
router.delete('/:planId/join', async (req, res) => {
  const plan = await plansService.leavePlan(getUserId(req), String(req.params.planId));
  res.json({ plan });
});

// Host approves or rejects a user's join request
router.patch('/:planId/requests/:userId', validateBody(reviewJoinRequestSchema), async (req, res) => {
  const plan = await plansService.reviewJoinRequest(
    getUserId(req),
    String(req.params.planId),
    String(req.params.userId),
    req.body.status,
  );
  res.json({ plan });
});

// Nested group chat router: /plans/:planId/messages
router.use('/:planId/messages', planChatRoutes);

export default router;
