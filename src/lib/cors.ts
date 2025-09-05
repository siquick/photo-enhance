import { NextResponse } from 'next/server';

export function corsHeaders(origin?: string) {
  const allowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim());
  const allow = origin && allowed?.includes(origin) ? origin : allowed?.[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  } as const;
}

export function handleOptions(origin?: string) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

