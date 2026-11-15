import { NextResponse } from 'next/server';
import { ServiceError } from '@tftd/api';
import { getRequestUserId } from '@/lib/server/session';

export const API_VERSION = '1';

export type ApiErrorCode =
  | ServiceError['code']
  | 'offline'
  | 'internal_error';

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.API_CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Voter-Token, X-Requested-With',
  'Access-Control-Expose-Headers': 'X-API-Version, X-Voter-Token',
  'X-API-Version': API_VERSION,
};

const STATUS_BY_CODE: Record<ServiceError['code'], number> = {
  invalid: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
};

export function hasDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function apiHeaders(extra?: HeadersInit, cacheControl = 'no-store'): Headers {
  const headers = new Headers(CORS_HEADERS);
  headers.set('Cache-Control', cacheControl);
  if (extra) {
    new Headers(extra).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

export function apiOk<T>(
  data: T,
  init?: { status?: number; headers?: HeadersInit; cacheControl?: string }
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { ok: true, data },
    {
      status: init?.status ?? 200,
      headers: apiHeaders(init?.headers, init?.cacheControl ?? 'no-store'),
    }
  );
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    {
      status,
      headers: apiHeaders(undefined, 'no-store'),
    }
  );
}

export function apiOffline(message = 'Baza de date nu e disponibilă.'): NextResponse<ApiFailure> {
  return apiError('offline', message, 503);
}

export function apiFromError(e: unknown): NextResponse<ApiFailure> {
  if (e instanceof ServiceError) {
    return apiError(e.code, e.message, STATUS_BY_CODE[e.code] ?? 400);
  }
  console.error('[api/v1]', e);
  return apiError('internal_error', 'Ceva n-a mers. Încearcă din nou.', 500);
}

export function apiOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: apiHeaders(undefined, 'public, max-age=86400'),
  });
}

export async function parseJsonBody<T = Record<string, unknown>>(req: Request): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse<ApiFailure> }> {
  try {
    const body = (await req.json()) as T;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, response: apiError('invalid', 'Corp JSON invalid.', 400) };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, response: apiError('invalid', 'Corpul cererii nu este JSON valid.', 400) };
  }
}

export async function requireAuthUserId(
  req: Request,
  message = 'Intră în cont ca să continui.'
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse<ApiFailure> }> {
  const userId = await getRequestUserId(req);
  if (!userId) {
    return { ok: false, response: apiError('unauthorized', message, 401) };
  }
  return { ok: true, userId };
}
