import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

const isDev = process.env.NODE_ENV === "development";

// Build providers list dynamically based on available credentials
const providers: any[] = [];

// Add Google if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Add Apple if configured
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    })
  );
}

// Add a demo/dev credentials provider for local development
if (isDev) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "dev@example.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Find or create dev user
        const email = credentials.email as string;
        let user = await db.user.findUnique({ where: { email } });

        if (!user) {
          user = await db.user.create({
            data: {
              email,
              name: email.split("@")[0],
            },
          });
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: {
    // Use JWT in development (required for credentials provider)
    // Use database sessions in production (better for OAuth)
    strategy: isDev ? "jwt" : "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        // For JWT sessions (credentials provider in dev)
        if (token?.sub) {
          session.user.id = token.sub;
        }
        // For database sessions (OAuth providers in prod)
        if (user?.id) {
          session.user.id = user.id;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});
