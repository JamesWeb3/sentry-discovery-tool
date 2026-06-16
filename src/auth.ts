import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Passcode",
      credentials: {
        code: { label: "Access code", type: "text" },
      },
      authorize: async (credentials) => {
        const code = typeof credentials?.code === "string" ? credentials.code : "";
        const expected = process.env.AUTH_PASSCODE;
        // Only a request bearing the shared access code is allowed in.
        if (expected && code === expected) {
          return { id: "sentry", name: "Sentry" };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    // Runs in the proxy (middleware) to gate every protected route.
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/signin")) return true;
      return !!auth;
    },
  },
});
