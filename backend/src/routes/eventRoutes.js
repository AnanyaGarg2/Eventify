import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roles.js';
import { upload } from '../utils/upload.js';
import { createEvent, updateEvent, deleteEvent, listEvents, getEvent } from '../controllers/eventController.js';
import { registerForEvent } from '../controllers/registrationController.js';
import { getEventParticipants, updateParticipantLimit } from '../controllers/participantController.js';

const router = Router();

router.get('/', optionalAuthenticate, listEvents);
router.get('/:eventId/participants', authenticate, authorizeRoles('organizer'), getEventParticipants);
router.post('/:eventId/register', authenticate, authorizeRoles('customer', 'organizer', 'admin'), registerForEvent);
router.patch('/:eventId/participant-limit', authenticate, authorizeRoles('organizer'), updateParticipantLimit);
router.get('/:id', getEvent);
router.post('/', authenticate, authorizeRoles('organizer', 'admin'), upload.single('poster'), createEvent);
router.put('/:id', authenticate, authorizeRoles('organizer', 'admin'), upload.single('poster'), updateEvent);
router.delete('/:id', authenticate, authorizeRoles('organizer', 'admin'), deleteEvent);

export default router;
