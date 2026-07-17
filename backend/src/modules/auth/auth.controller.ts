import { Request, Response } from 'express';
import * as authService from './auth.service';
import { created, ok } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiResponse';

export async function registerHandler(req: Request, res: Response) {
  const result = await authService.register(req.body);
  created(res, result);
}

export async function loginHandler(req: Request, res: Response) {
  const result = await authService.login(req.body.email, req.body.password);
  ok(res, result);
}

export async function refreshHandler(req: Request, res: Response) {
  const result = await authService.refresh(req.body.refreshToken);
  ok(res, result);
}

export async function logoutHandler(req: Request, res: Response) {
  await authService.logout(req.body.refreshToken);
  ok(res, { message: 'Logged out' });
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  await authService.forgotPassword(req.body.email);
  ok(res, { message: 'If that email exists, a reset link has been sent.' });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  ok(res, { message: 'Password has been reset. Please log in.' });
}

export async function meHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getMe(req.user.sub);
  ok(res, user);
}
