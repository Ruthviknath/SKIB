import { Router } from 'express';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { getUserId, requireAuth } from '../../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const userId = getUserId(req);
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  res.json({
    unreadCount,
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.post('/read-all', async (req, res) => {
  const userId = getUserId(req);
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

router.post('/:notificationId/read', async (req, res) => {
  const userId = getUserId(req);
  const notif = await prisma.notification.findFirst({
    where: { id: String(req.params.notificationId), userId },
  });
  if (!notif) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');

  const updated = await prisma.notification.update({
    where: { id: notif.id },
    data: { readAt: notif.readAt ?? new Date() },
  });
  res.json({
    notification: {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      body: updated.body,
      link: updated.link,
      readAt: updated.readAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    },
  });
});

export default router;
