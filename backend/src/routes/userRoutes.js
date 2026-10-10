import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { myEventRegistrations } from '../controllers/registrationController.js';

const router = Router();

router.get('/me/events', authenticate, myEventRegistrations);

export default router;
