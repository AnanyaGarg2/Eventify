import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roles.js';
import {
  createSponsorship,
  getEventSponsorship,
  listEventSponsors,
  updateSponsorshipStatus,
} from '../controllers/sponsorshipController.js';
import { uploadSponsorshipLogo } from '../utils/upload.js';

const router = Router();

router.get('/events/:eventId/sponsorship', getEventSponsorship);
router.post('/events/:eventId/sponsorship', authenticate, uploadSponsorshipLogo, createSponsorship);
router.get('/organizer/events/:eventId/sponsors', authenticate, authorizeRoles('organizer'), listEventSponsors);
router.patch('/sponsorship/:sponsorshipId/status', authenticate, authorizeRoles('organizer'), updateSponsorshipStatus);

export default router;
