import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import authRoutes from './features/auth/auth.routes';
import catalogRoutes from './features/catalog/catalog.routes';
import communitiesRoutes from './features/communities/communities.routes';
import directChatRoutes from './features/direct-chat/direct-chat.routes';
import discoveryRoutes from './features/discovery/discovery.routes';
import memoriesRoutes from './features/memories/memories.routes';
import notificationsRoutes from './features/notifications/notifications.routes';
import onboardingRoutes from './features/onboarding/onboarding.routes';
import plansRoutes from './features/plans/plans.routes';
import profileRoutes from './features/profile/profile.routes';
import safetyRoutes from './features/safety/safety.routes';
import { config } from './lib/config';
import { errorHandler, notFound } from './middleware/error-handler';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.webOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/uploads', express.static(config.storage.uploadDir)); // local storage only

  app.use('/auth', authRoutes);
  app.use('/catalog', catalogRoutes);
  app.use('/profile', profileRoutes);
  app.use('/onboarding', onboardingRoutes);
  app.use('/plans', plansRoutes);
  app.use('/discovery', discoveryRoutes);
  app.use('/matches', directChatRoutes);
  app.use('/communities', communitiesRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/safety', safetyRoutes);
  app.use('/memories', memoriesRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
