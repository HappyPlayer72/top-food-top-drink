import spec from '../../../../../../../docs/openapi-v1.json';
import { apiHeaders, apiOptions } from '@/lib/api/http';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const OPTIONS = apiOptions;

export async function GET() {
  return NextResponse.json(spec, {
    status: 200,
    headers: apiHeaders(undefined, 'public, max-age=3600'),
  });
}
