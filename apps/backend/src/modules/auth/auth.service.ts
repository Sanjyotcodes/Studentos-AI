// Auth business logic: password hashing (bcrypt), access/refresh token issue and rotation.
import crypto from 'node:crypto';
import type { LoginInput, RegisterInput, User } from '@studentos/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';

const BCRYPT_COST = 12;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function hashOpaqueSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function generateOpaqueSecret(): string {
  return crypto.randomBytes(40).toString('hex');
}

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

// Refresh tokens are opaque, not JWTs: only the SHA-256 hash of the secret is
// stored, and the returned string is "<refreshTokenRowId>:<secret>" so a
// rotation/revocation lookup is a single indexed id query, never a table scan.
async function issueRefreshToken(userId: string): Promise<string> {
  const secret = generateOpaqueSecret();
  const tokenHash = hashOpaqueSecret(secret);
  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));

  const record = await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return `${record.id}:${secret}`;
}

async function issueTokenPair(userId: string) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId),
    issueRefreshToken(userId),
  ]);
  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists', undefined, 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
  });

  const tokens = await issueTokenPair(user.id);
  return { user: toPublicUser(user), ...tokens };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    // Same message/status as a wrong password — never reveal whether the email exists.
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const tokens = await issueTokenPair(user.id);
  return { user: toPublicUser(user), ...tokens };
}

function parseOpaqueToken(rawToken: string): { id: string; secret: string } {
  const separatorIndex = rawToken.indexOf(':');
  if (separatorIndex === -1) {
    throw new UnauthorizedError('Invalid refresh token');
  }
  return {
    id: rawToken.slice(0, separatorIndex),
    secret: rawToken.slice(separatorIndex + 1),
  };
}

export async function refreshTokens(rawRefreshToken: string) {
  const { id, secret } = parseOpaqueToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { id } });
  if (!stored) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const presentedHash = Buffer.from(hashOpaqueSecret(secret));
  const storedHash = Buffer.from(stored.tokenHash);
  const hashesMatch =
    presentedHash.length === storedHash.length && crypto.timingSafeEqual(presentedHash, storedHash);

  if (!hashesMatch) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    // A revoked-or-expired token being presented again is a reuse/theft signal,
    // not just an expired session — kill every other active session for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token is no longer valid');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(stored.userId);
}

export async function logoutUser(rawRefreshToken: string): Promise<void> {
  const { id } = parseOpaqueToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getUserById(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('User no longer exists');
  }
  return toPublicUser(user);
}
