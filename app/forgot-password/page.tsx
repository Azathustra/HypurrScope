"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PublicNavbar } from "@/components/saas/public-navbar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      toast.error("Supabase n'est pas encore configure.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings/security`
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Email de reinitialisation envoye.");
  }

  return (
    <>
      <PublicNavbar />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center px-4">
        <form onSubmit={onSubmit} className="premium-card w-full rounded-[20px] p-6">
          <h1 className="text-2xl font-semibold text-white">Mot de passe oublie</h1>
          <p className="mt-2 text-sm text-muted">Recois un lien pour securiser ton compte.</p>
          <input className="mt-6 w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-white" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <button className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Envoyer le lien</button>
          <p className="mt-4 text-center text-sm text-muted">
            <Link href="/login" className="text-accent">Retour connexion</Link>
          </p>
        </form>
      </main>
    </>
  );
}
