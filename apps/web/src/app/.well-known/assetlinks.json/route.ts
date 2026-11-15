import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Digital Asset Links pentru Android App Links (`https://topfood.ro/...` → aplicația nativă Android).
 * Configurează `ANDROID_PACKAGE_NAME` și `ANDROID_SHA256_CERT_FINGERPRINTS` (separate prin virgulă) în .env.
 */
export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim() || 'ro.topfood.app';
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!fingerprints.length) {
    return NextResponse.json(
      [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: packageName,
            sha256_cert_fingerprints: [],
          },
          _note: 'Set ANDROID_PACKAGE_NAME and ANDROID_SHA256_CERT_FINGERPRINTS in .env for verified App Links.',
        },
      ],
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      }
    );
  }

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    }
  );
}
