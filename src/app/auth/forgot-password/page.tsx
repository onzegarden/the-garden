"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GardenLogo } from "@/components/ui/GardenLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setError("Une erreur est survenue. Vérifie l'adresse et réessaie.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="px-6 py-6 border-b border-garden-border">
          <Link href="/">
            <GardenLogo />
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm animate-fade-up text-center">
            <div className="w-16 h-16 bg-garden-green-light rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✉️</span>
            </div>

            <h2 className="text-display-sm font-bold text-garden-black mb-3">
              Consulte ta boîte mail
            </h2>
            <p className="text-sm font-extralight text-garden-text-muted leading-relaxed mb-2">
              Un lien de réinitialisation a été envoyé à{" "}
              <span className="font-normal text-garden-black">{email}</span>.
            </p>
            <p className="text-sm font-extralight text-garden-text-muted leading-relaxed mb-8">
              Clique dessus pour choisir un nouveau mot de passe. Le lien est
              valable 1 heure.
            </p>

            <Link href="/auth/login" className="btn-secondary w-full py-3 block text-center">
              ← Retour à la connexion
            </Link>

            <p className="mt-6 text-xs font-mono text-garden-text-muted">
              Vérifie aussi tes spams, au cas où.
            </p>
          </div>
        </div>

        <div className="h-1 bg-garden-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <nav className="px-6 py-6 border-b border-garden-border">
        <Link href="/">
          <GardenLogo />
        </Link>
      </nav>

      {/* Auth card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-display-sm font-bold text-garden-black mb-2">
              Mot de passe oublié ?
            </h1>
            <p className="text-sm font-extralight text-garden-text-muted leading-relaxed">
              Pas de panique. Saisis ton email et on t&apos;envoie un lien pour
              en choisir un nouveau.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="font-mono text-xs text-garden-text-muted uppercase tracking-wide"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input-base"
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-card px-3 py-2 font-mono">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Envoi…" : "Envoyer le lien de réinitialisation →"}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm font-extralight text-garden-text-muted">
            Tu te souviens ?{" "}
            <Link
              href="/auth/login"
              className="text-garden-green font-normal hover:underline underline-offset-2 transition-colors"
            >
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>

      {/* Decorative bottom stripe */}
      <div className="h-1 bg-garden-green" />
    </div>
  );
}
