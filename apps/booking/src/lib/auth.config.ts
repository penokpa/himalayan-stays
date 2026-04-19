import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

/**
 * Base NextAuth config shared between middleware (edge) and server-side auth.
 * Does NOT include providers that use Node.js APIs (like bcrypt).
 */
export const authConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role;
        token.userId = user.id!;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as UserRole;
      session.user.id = token.userId as string;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
