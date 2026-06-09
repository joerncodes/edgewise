"use client";

import { signOut, useSession } from "next-auth/react";

export function SignOutButton() {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Sign out
    </button>
  );
}
