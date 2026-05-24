import { NextResponse, type NextRequest } from "next/server";

// Auth-protected route guard is handled on the client side
// (app/dashboard/layout.tsx) via Zustand + Supabase browser client.
//
// Supabase browser client stores sessions in localStorage.
// Server-side middleware cannot read localStorage, and in Replit's proxy
// environment, browser-set cookies are also invisible to server-side checks.
// Route protection therefore lives in the client layout guard.

export async function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
