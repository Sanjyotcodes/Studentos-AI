// Backend-internal auth types. Public shapes (User, AuthTokens, AuthResponse)
// live in @studentos/shared instead.

export interface AccessTokenPayload {
  sub: string; // userId
}
