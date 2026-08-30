// Auth request handlers. Parse (already done by validate.middleware) → delegate → shape response.
import { catchAsync } from '../../lib/catchAsync';
import * as authService from './auth.service';

export const register = catchAsync(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json({ success: true, data: result });
});

export const login = catchAsync(async (req, res) => {
  const result = await authService.loginUser(req.body);
  res.status(200).json({ success: true, data: result });
});

export const refresh = catchAsync(async (req, res) => {
  const tokens = await authService.refreshTokens(req.body.refreshToken);
  res.status(200).json({ success: true, data: tokens });
});

export const logout = catchAsync(async (req, res) => {
  await authService.logoutUser(req.body.refreshToken);
  res.status(204).send();
});

export const me = catchAsync(async (req, res) => {
  const user = await authService.getUserById(req.user!.id);
  res.status(200).json({ success: true, data: user });
});
