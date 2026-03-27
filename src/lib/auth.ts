import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (user.isBlocked) {
          throw new Error("Your account has been blocked. Please contact support.");
        }

        if (!user.password) {
          throw new Error("This account uses Google login. Please sign in with Google.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Update last active timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!;
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { accounts: true },
        });

        if (existingUser) {
          if (existingUser.isBlocked) {
            return false;
          }

          // Link Google account if not already linked
          const hasGoogleAccount = existingUser.accounts.some(
            (a) => a.provider === "google"
          );
          if (!hasGoogleAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token as string | undefined,
                access_token: account.access_token as string | undefined,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token as string | undefined,
                session_state: account.session_state as string | undefined,
              },
            });
          }
        } else {
          // Create new user with PATIENT role by default
          const newUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split("@")[0],
              role: "PATIENT",
              emailVerified: true,
              accounts: {
                create: {
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token as string | undefined,
                  access_token: account.access_token as string | undefined,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token as string | undefined,
                  session_state: account.session_state as string | undefined,
                },
              },
              patientProfile: {
                create: {},
              },
            },
          });
          user.id = newUser.id;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === "google") {
        // Fetch the database user to get role and id
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.activeRole = dbUser.role === "BOTH" ? "PATIENT" : dbUser.role;
        }
      } else if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        // For BOTH users, default activeRole to PATIENT
        token.activeRole = (user as any).role === "BOTH" ? "PATIENT" : (user as any).role;
      }
      // Allow updating activeRole and role via session update
      if (trigger === "update") {
        if (session?.role) {
          token.role = session.role;
        }
        if (session?.activeRole) {
          token.activeRole = session.activeRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).activeRole = token.activeRole || token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
