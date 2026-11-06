import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../../lib/config';
import { validateBody } from '../../middleware/validate';
import { requestOtp } from '../../services/otp/otp.service';
import { requestOtpSchema, verifyOtpSchema } from './auth.schemas';
import { loginWithOtp } from './auth.service';

const router = Router();

// Per-IP limiter on top of the per-phone OTP limits.
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.nodeEnv === 'test',
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, try again later' } },
  }),
);

router.post('/otp/request', validateBody(requestOtpSchema), async (req, res) => {
  const result = await requestOtp(req.body.phone);
  res.json({
    phone: req.body.phone,
    expiresInSeconds: result.expiresInSeconds,
    resendInSeconds: result.resendInSeconds,
    ...(config.exposeDevOtp ? { devCode: result.code } : {}),
  });
});

router.post('/otp/verify', validateBody(verifyOtpSchema), async (req, res) => {
  res.json(await loginWithOtp(req.body.phone, req.body.code));
});

export default router;
