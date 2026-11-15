import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { UserRole } from '../src/types.ts';

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_food_rescue_ai_secret_v1').digest('hex');

function cleanEnv(raw: string | undefined): string {
  return (raw || '').trim().replace(/^["']|["']$/g, '').trim();
}

function normalizeSupabaseUrl(raw: string | undefined): string {
  const value = cleanEnv(raw);
  if (!value) return '';
  const upper = value.toUpperCase();
  if (
    upper.includes('YOUR_PROJECT') ||
    upper.includes('YOUR_SUPABASE') ||
    upper.startsWith('MY_') ||
    value.includes('<') ||
    value.includes('>')
  ) {
    return '';
  }
  if (/^[a-z0-9]{15,36}$/i.test(value)) {
    return `https://${value}.supabase.co`;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(value) && !value.includes(' ')) {
    return `https://${value}`;
  }
  return value;
}

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getServerSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const anonKey = cleanEnv(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const configured =
    isValidHttpUrl(url) &&
    Boolean(anonKey) &&
    !anonKey.toUpperCase().includes('YOUR_SUPABASE') &&
    !anonKey.toUpperCase().startsWith('MY_') &&
    !anonKey.startsWith('http://') &&
    !anonKey.startsWith('https://') &&
    anonKey.length >= 20;
  return { url, anonKey, configured };
}

export function isServerSupabaseConfigured(): boolean {
  return getServerSupabaseConfig().configured;
}

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email: string;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as TokenPayload;
    if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function verifySupabaseJwt(token: string): Promise<TokenPayload | null> {
  const { url, anonKey, configured } = getServerSupabaseConfig();
  if (!configured) return null;

  try {
    const client = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userData.user) return null;

    const { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('role, status, email')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.status === 'suspended') {
      return null;
    }

    const role = (profile.role || 'donor') as UserRole;

    return {
      userId: userData.user.id,
      email: profile.email || userData.user.email || '',
      role,
      exp: Date.now() + 60 * 60 * 1000,
    };
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  auth?: TokenPayload;
}

export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const found = cookies.find((c) => c.startsWith('fr_token='));
    if (found) {
      return decodeURIComponent(found.slice('fr_token='.length));
    }
  }
  return null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  let payload = verifyToken(token);
  if (!payload && isServerSupabaseConfigured()) {
    payload = await verifySupabaseJwt(token);
  }

  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  req.auth = payload;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({
        error: `Access restricted. Required role: ${roles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}
