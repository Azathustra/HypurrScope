"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PublicNavbar } from "@/components/saas/public-navbar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      toast.error("Supabase n'est pas encore configuré.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <>
      <PublicNavbar />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center px-4">
        <form onSubmit={onSubmit} className="premium-card w-full rounded-[20px] p-6">
          <h1 className="text-2xl font-semibold text-white">Connexion</h1>
          <p className="mt-2 text-sm text-muted">Accéder à l'espace membre Crypto Hold-Up.</p>
          <input className="mt-6 w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-white" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className="mt-3 w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-white" placeholder="Mot de passe" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Se connecter</button>
          <p className="mt-4 text-center text-sm text-muted">
            Pas de compte ? <Link href="/signup" className="text-accent">Créer un compte</Link>
          </p>
        </form>
      </main>
    </>
  );
}
