// Next.js 16 renamed Middleware to Proxy. The Auth.js `auth` handler reads the
// session JWT and, via the `authorized` callback in src/auth.ts, redirects any
// unauthenticated request to /signin.
export { auth as proxy } from "@/auth";

export const config = {
  // Run on everything except the auth endpoints, Next internals, and static
  // assets (so the sign-in screen's logo and favicon load without a session).
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)"],
};
