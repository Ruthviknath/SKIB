import { Router } from 'express';
import { getUserId, requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { imageUpload } from '../../services/storage/storage.service';
import { updateProfileSchema } from './profile.schemas';
import * as profileService from './profile.service';

const router = Router();
router.use(requireAuth);

router.get('/me', async (req, res) => {
  res.json({ profile: await profileService.getProfile(getUserId(req)) });
});

router.patch('/me', validateBody(updateProfileSchema), async (req, res) => {
  res.json({ profile: await profileService.updateProfile(getUserId(req), req.body) });
});

router.post('/me/photos', imageUpload.single('photo'), async (req, res) => {
  res.status(201).json({ profile: await profileService.addPhoto(getUserId(req), req.file) });
});

router.delete('/me/photos/:photoId', async (req, res) => {
  res.json({ profile: await profileService.removePhoto(getUserId(req), req.params.photoId) });
});

router.delete('/me', async (req, res) => {
  await profileService.deleteAccount(getUserId(req));
  res.status(204).end();
});

export default router;
