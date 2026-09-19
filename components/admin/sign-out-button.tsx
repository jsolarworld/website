"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-md px-2 py-1 text-on-chassis-muted hover:bg-white/10 hover:text-white"
      onClick={async () => {
        await authClient.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
