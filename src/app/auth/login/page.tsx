"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GardenLogo } from "@/components/ui/GardenLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

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
              Bon retour 🌱
            </h1>
            <p className="text-sm font-extralight text-garden-text-muted">
              Reconnecte-toi à ton jardin.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="font-mono text-xs text-garden-text-muted uppercase tracking-wide"
                >
                  Mot de passe
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-garden-text-muted hover:text-garden-green transition-colors underline underline-offset-2"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Connexion…" : "Entrer dans mon jardin →"}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm font-extralight text-garden-text-muted">
            Pas encore de jardin ?{" "}
            <Link
              href="/auth/signup"
              className="text-garden-green font-normal hover:underline underline-offset-2 transition-colors"
            >
              Créer le mien
            </Link>
          </p>
        </div>
      </div>

      {/* Decorative bottom stripe */}
      <div className="h-1 bg-garden-green" />
    </div>
  );
}
