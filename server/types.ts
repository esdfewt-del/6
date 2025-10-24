import 'express-session';
import { User } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    user: Omit<User, 'password'>;
  }
}

export {};
