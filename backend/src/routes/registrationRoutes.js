import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roles.js';
import { registerForEvent, myRegistrations, participantsForEvent, checkInParticipant, exportParticipantsCsv } from '../controllers/registrationController.js';
import { updateRegistrationStatus } from '../controllers/participantController.js';

const router = Router();

router.post('/:id/register', authenticate, authorizeRoles('customer', 'organizer', 'admin'), registerForEvent);
router.get('/me', authenticate, myRegistrations);
router.patch('/:registrationId/status', authenticate, authorizeRoles('organizer'), updateRegistrationStatus);
router.get('/:id/participants', authenticate, authorizeRoles('organizer', 'admin'), participantsForEvent);
router.post('/:id/checkin', authenticate, authorizeRoles('organizer', 'admin'), checkInParticipant);
router.get('/:id/participants.csv', authenticate, authorizeRoles('organizer', 'admin'), exportParticipantsCsv);

export default router;

