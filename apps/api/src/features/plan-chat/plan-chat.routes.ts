import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { sendPlanMessageSchema } from './plan-chat.schemas';
import * as planChatService from './plan-chat.service';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { planId } = req.params as { planId: string };
  res.json({ messages: await planChatService.listMessages(getUserId(req), planId) });
});

router.post('/', validateBody(sendPlanMessageSchema), async (req, res) => {
  const { planId } = req.params as { planId: string };
  const message = await planChatService.sendMessage(getUserId(req), planId, req.body.body);
  res.status(201).json({ message });
});

export default router;
