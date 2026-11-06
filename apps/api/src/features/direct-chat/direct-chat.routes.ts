import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { sendDirectMessageSchema } from './direct-chat.schemas';
import * as directChatService from './direct-chat.service';

const router = Router();
router.use(requireAuth);

router.get('/:matchId/messages', async (req, res) => {
  const data = await directChatService.getMatchConversation(getUserId(req), String(req.params.matchId));
  res.json(data);
});

router.post('/:matchId/messages', validateBody(sendDirectMessageSchema), async (req, res) => {
  const message = await directChatService.sendDirectMessage(
    getUserId(req),
    String(req.params.matchId),
    req.body.body,
  );
  res.status(201).json({ message });
});

export default router;
