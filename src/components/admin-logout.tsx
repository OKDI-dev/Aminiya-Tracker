"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-line-soft px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      <LogOut size={16} />
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
