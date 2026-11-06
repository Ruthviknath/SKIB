import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import authRoutes from './features/auth/auth.routes';
import catalogRoutes from './features/catalog/catalog.routes';
import onboardingRoutes from './features/onboarding/onboarding.routes';
import plansRoutes from './features/plans/plans.routes';
import profileRoutes from './features/profile/profile.routes';
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

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
