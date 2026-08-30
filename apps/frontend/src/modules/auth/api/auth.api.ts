// Typed calls to the backend's /auth/* routes. All go through api-client
// (T7.9) — nothing here calls fetch directly.
import type { AuthResponse, AuthTokens, LoginInput, RegisterInput, User } from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/register', input);
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/login', input);
}

// Not called directly in normal operation — api-client refreshes silently
// on a 401. Exposed for completeness and for any future explicit "extend my
// session" action.
export function refresh(refreshToken: string): Promise<AuthTokens> {
  return apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
}

export function logout(refreshToken: string): Promise<void> {
  return apiClient.post<void>('/auth/logout', { refreshToken });
}

export function getCurrentUser(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}
