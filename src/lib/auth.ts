import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const APP_USER_ID = "owner";

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
        const expected = process.env.APP_PASSWORD;
        if (!expected) {
          throw new Error("APP_PASSWORD is not set");
        }
        const provided = String(credentials?.password ?? "");
        if (!timingSafeEqual(provided, expected)) return null;
        return { id: APP_USER_ID, name: "Owner" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});

export function checkApiToken(authorization: string | null): boolean {
  const token = process.env.API_TOKEN;
  if (!token || !authorization) return false;
  const [scheme, value] = authorization.split(" ");
  if (scheme !== "Bearer" || !value) return false;
  return timingSafeEqual(value, token);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
