import { Request } from 'express';

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
    subscriptionType?: string;
    [key: string]: any;
  };
}
