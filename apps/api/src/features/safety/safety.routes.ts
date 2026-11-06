import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createReportSchema, resolveReportSchema } from './safety.schemas';
import * as safetyService from './safety.service';

const router = Router();
router.use(requireAuth);

router.get('/blocks', async (req, res) => {
  res.json({ blocks: await safetyService.listBlocks(getUserId(req)) });
});

router.post('/block/:userId', async (req, res) => {
  const blocks = await safetyService.blockUser(getUserId(req), String(req.params.userId));
  res.status(201).json({ blocks });
});

router.delete('/block/:userId', async (req, res) => {
  const blocks = await safetyService.unblockUser(getUserId(req), String(req.params.userId));
  res.json({ blocks });
});

router.post('/reports', validateBody(createReportSchema), async (req, res) => {
  const report = await safetyService.createReport(getUserId(req), req.body);
  res.status(201).json({ report });
});

// Basic moderation/admin endpoints to view and resolve reports
router.get('/reports', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ reports: await safetyService.listReports(status) });
});

router.patch('/reports/:reportId', validateBody(resolveReportSchema), async (req, res) => {
  const report = await safetyService.updateReportStatus(String(req.params.reportId), req.body.status);
  res.json({ report });
});

export default router;
