import { Request } from 'express';

export const getRequestContext = (req: Request) => ({
  requestId: req.requestId,
  userId: req.user?.id,
});
