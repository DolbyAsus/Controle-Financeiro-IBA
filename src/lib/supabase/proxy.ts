import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseEnvironment, isSupabaseConfigured } from "./config";

function securityHeaders(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://challenges.cloudflare.com",
    "upgrade-insecure-requests",
  ].join("; ");
  return {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...(isDevelopment ? {} : { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" }),
  };
}

function applySecurityHeaders(response: NextResponse, headers: Record<string, string>) {
  Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

export async function updateSession(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const headers = securityHeaders(nonce);
  if (!isSupabaseConfigured()) return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), headers);

  const { url, key } = getSupabaseEnvironment();
  let response = applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), headers);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), headers);
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}
