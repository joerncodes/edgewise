import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const APP_USER_ID = "owner";

const APP_PASSWORD = normalizeSecret(process.env.APP_PASSWORD);
const API_TOKEN = normalizeSecret(process.env.API_TOKEN);

if (!APP_PASSWORD) {
  console.error("[auth] APP_PASSWORD is missing or empty after trimming");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!APP_PASSWORD) {
          throw new Error("APP_PASSWORD is not set");
        }
        const provided = String(credentials?.password ?? "");
        if (!timingSafeEqual(provided, APP_PASSWORD)) return null;
        return { id: APP_USER_ID, name: "Owner" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});

export function checkApiToken(authorization: string | null): boolean {
  if (!API_TOKEN || !authorization) return false;
  const [scheme, value] = authorization.split(" ");
  if (scheme !== "Bearer" || !value) return false;
  return timingSafeEqual(value, API_TOKEN);
}

function normalizeSecret(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
