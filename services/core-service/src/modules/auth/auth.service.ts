import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import {
  MembershipRole,
  PlanId,
  prisma,
  SubscriptionStatus,
} from '@spacode/db';
import type { AuthTokens, AuthUserDto } from '@spacode/types';
import {
  decrypt,
  encrypt,
  Errors,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@spacode/utils';
import { getConfig } from '../../config.js';
import { OTP_PREFIX, OTP_TTL_SEC, getRedis } from '../../lib/redis.js';

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export async function requestOtp(email: string, planTier?: PlanId): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const code = generateOtp();
  const redis = getRedis();
  await redis.setex(`${OTP_PREFIX}${normalized}`, OTP_TTL_SEC, JSON.stringify({ code, planTier }));
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<{ tokens: AuthTokens; user: AuthUserDto }> {
  const normalized = email.toLowerCase().trim();
  const redis = getRedis();
  const raw = await redis.get(`${OTP_PREFIX}${normalized}`);
  if (!raw) throw Errors.unauthorized('Invalid or expired code');

  const stored = JSON.parse(raw) as { code: string; planTier?: PlanId };
  if (stored.code !== code) throw Errors.unauthorized('Invalid code');
  await redis.del(`${OTP_PREFIX}${normalized}`);

  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    user = await prisma.user.create({ data: { email: normalized } });
  }
  await ensureUserSetup(user.id, stored.planTier ?? PlanId.SOLO_BASIC);

  return issueTokens(user.id);
}

export async function verifyGoogle(
  idToken: string,
  planTier?: PlanId,
): Promise<{ tokens: AuthTokens; user: AuthUserDto }> {
  const cfg = getConfig();
  if (!cfg.GOOGLE_CLIENT_ID) throw Errors.internal('Google OAuth not configured');

  const client = new OAuth2Client(cfg.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: cfg.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw Errors.unauthorized('Invalid Google token');

  const email = payload.email.toLowerCase();
  let user = await prisma.user.findFirst({
    where: { OR: [{ email }, { googleSub: payload.sub }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email, googleSub: payload.sub },
    });
    await ensureUserSetup(user.id, planTier ?? PlanId.SOLO_BASIC);
  } else if (!user.googleSub) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleSub: payload.sub },
    });
  }

  return issueTokens(user.id);
}

export async function ensureUserSetup(userId: string, planId: PlanId): Promise<void> {
  const existing = await prisma.membership.findFirst({ where: { userId } });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: 'My Organization' },
    });
    await tx.membership.create({
      data: { userId, organizationId: org.id, role: MembershipRole.OWNER },
    });
    await tx.userProfile.create({ data: { userId } });
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await tx.subscription.create({
      data: {
        organizationId: org.id,
        planId,
        status: SubscriptionStatus.TRIALING,
        trialEndsAt: trialEnd,
      },
    });
  });
}

async function issueTokens(userId: string): Promise<{ tokens: AuthTokens; user: AuthUserDto }> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: {
      organization: { include: { subscription: true } },
      user: { include: { profile: true } },
    },
  });
  if (!membership) throw Errors.internal('User setup incomplete');

  const refreshToken = signRefreshToken(userId);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  const accessToken = signAccessToken({
    sub: userId,
    orgId: membership.organizationId,
    role: membership.role,
    systemRole: membership.user.systemRole,
  });

  const user: AuthUserDto = {
    id: membership.user.id,
    email: membership.user.email,
    systemRole: membership.user.systemRole,
    organizationId: membership.organizationId,
    membershipRole: membership.role,
    planTier: membership.organization.subscription?.planId ?? PlanId.SOLO_BASIC,
    twoFactorEnabled: membership.user.profile?.twoFactorEnabled ?? false,
  };

  return {
    tokens: { accessToken, refreshToken, expiresIn: 900 },
    user,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ tokens: AuthTokens; user: AuthUserDto }> {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.sub, tokenHash },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw Errors.unauthorized('Invalid refresh token');
  }
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  return issueTokens(payload.sub);
}

export async function setup2FA(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user) throw Errors.notFound('User not found');

  const secret = speakeasy.generateSecret({ name: `Spacode (${user.email})` });
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, twoFactorSecret: encrypt(secret.base32!) },
    update: { twoFactorSecret: encrypt(secret.base32!) },
  });

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
  return { secret: secret.base32!, qrCodeUrl };
}

export async function verify2FA(userId: string, code: string): Promise<void> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile?.twoFactorSecret) throw Errors.validation('2FA not initialized');

  const secret = decrypt(profile.twoFactorSecret);
  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
  if (!valid) throw Errors.unauthorized('Invalid 2FA code');

  await prisma.userProfile.update({
    where: { userId },
    data: { twoFactorEnabled: true },
  });
}

export async function createInvite(
  orgId: string,
  _invitedById: string,
  email: string,
  role: string = MembershipRole.MEMBER,
): Promise<{ token: string; expiresAt: Date }> {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.teamInvite.create({
    data: {
      organizationId: orgId,
      email: email.toLowerCase(),
      role,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

async function assertOtpValid(email: string, code: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const raw = await getRedis().get(`${OTP_PREFIX}${normalized}`);
  if (!raw) throw Errors.unauthorized('Invalid or expired code');
  const stored = JSON.parse(raw) as { code: string };
  if (stored.code !== code) throw Errors.unauthorized('Invalid code');
  await getRedis().del(`${OTP_PREFIX}${normalized}`);
}

export async function register(
  email: string,
  code: string,
  planId: PlanId,
  _trial?: boolean,
): Promise<{ tokens: AuthTokens; user: AuthUserDto }> {
  await assertOtpValid(email, code);
  const normalized = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    const membership = await prisma.membership.findFirst({ where: { userId: existing.id } });
    if (membership) {
      throw Errors.validation('Account already exists — please log in');
    }
  }

  const user = existing ?? (await prisma.user.create({ data: { email: normalized } }));
  await ensureUserSetup(user.id, planId);
  return issueTokens(user.id);
}

export async function acceptInvite(
  token: string,
  email: string,
  code: string,
): Promise<{ tokens: AuthTokens; user: AuthUserDto }> {
  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw Errors.notFound('Invite not found or expired');
  }
  if (invite.email !== email.toLowerCase()) {
    throw Errors.validation('Email does not match invite');
  }

  await assertOtpValid(email, code);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw Errors.notFound('User not found — register first');

  const existing = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId: user.id, organizationId: invite.organizationId },
    },
  });
  if (!existing) {
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });
  }

  await prisma.teamInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return issueTokens(user.id);
}
