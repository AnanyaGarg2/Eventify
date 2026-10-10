import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roles.js';
import { approveUser,rejectUser, listPendingUsers, blockUser, unblockUser } from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));
router.get('/users/pending', listPendingUsers);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock', unblockUser);

export default router;
