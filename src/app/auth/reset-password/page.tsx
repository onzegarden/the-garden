"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GardenLogo } from "@/components/ui/GardenLogo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);

    setTimeout(() => {
      router.push("/dashboard");
    }, 2500);
  };

  if (done) {
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
              <span className="text-2xl">🌱</span>
            </div>

            <h2 className="text-display-sm font-bold text-garden-black mb-3">
              Mot de passe mis à jour
            </h2>
            <p className="text-sm font-extralight text-garden-text-muted leading-relaxed">
              Tout est bon. Tu vas être redirigé vers ton jardin dans un
              instant…
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
              Nouveau mot de passe
            </h1>
            <p className="text-sm font-extralight text-garden-text-muted">
              Choisis quelque chose de mémorable, et d&apos;au moins 8 caractères.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="font-mono text-xs text-garden-text-muted uppercase tracking-wide"
              >
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="input-base"
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm"
                className="font-mono text-xs text-garden-text-muted uppercase tracking-wide"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                className="input-base"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? "Mise à jour…" : "Enregistrer le nouveau mot de passe →"}
            </button>
          </form>
        </div>
      </div>

      {/* Decorative bottom stripe */}
      <div className="h-1 bg-garden-green" />
    </div>
  );
}
