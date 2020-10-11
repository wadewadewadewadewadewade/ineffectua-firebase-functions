import { auth } from 'firebase-admin';

// helpsed with this typescript typing modification by this document:
// https://dev.to/kwabenberko/extend-express-s-request-object-with-typescript-declaration-merging-1nn5

declare global{
  namespace Express {
      interface Request {
          user?: auth.DecodedIdToken
      }
  }
}