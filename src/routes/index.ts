// backend/src/routes/index.ts
import { Router } from 'express';
import { generateResponse } from '../controllers/index';

const router = Router();

router.post('/generate', generateResponse);

export default router;
