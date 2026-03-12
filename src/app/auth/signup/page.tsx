"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GardenLogo } from "@/components/ui/GardenLogo";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Cet email est déjà utilisé. Essaie de te connecter.");
      } else {
        setError("Une erreur est survenue. Réessaie.");
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleResend = async () => {
    setResendStatus("sending");
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setResendStatus("sent");
    setTimeout(() => setResendStatus("idle"), 4000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="px-6 py-6 border-b border-garden-border">
          <Link href="/">
            <GardenLogo />
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm animate-fade-up text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-garden-green-light rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">📬</span>
            </div>

            <h2 className="text-display-sm font-bold text-garden-black mb-3">
              Vérifie ta boîte mail
            </h2>
            <p className="text-sm font-extralight text-garden-text-muted leading-relaxed mb-2">
              On a envoyé un lien de confirmation à{" "}
              <span className="font-normal text-garden-black">{email}</span>.
            </p>
            <p className="text-sm font-extralight text-garden-text-muted leading-relaxed mb-8">
              Clique dessus pour activer ton compte Garden.
            </p>

            {/* CTA principal */}
            <button
              onClick={() => router.push("/auth/login")}
              className="btn-primary w-full py-3 mb-3"
            >
              J&apos;ai confirmé mon email →
            </button>

            {/* Renvoyer */}
            <button
              onClick={handleResend}
              disabled={resendStatus !== "idle"}
              className="btn-secondary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendStatus === "sending"
                ? "Envoi en cours…"
                : resendStatus === "sent"
                ? "Email renvoyé ✓"
                : "Renvoyer l'email"}
            </button>

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
              Crée ton jardin ✦
            </h1>
            <p className="text-sm font-extralight text-garden-text-muted">
              Un espace rien que pour toi, calme et personnel.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="font-mono text-xs text-garden-text-muted uppercase tracking-wide"
              >
                Prénom (optionnel)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="given-name"
                className="input-base"
                placeholder="Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
              <label
                htmlFor="password"
                className="font-mono text-xs text-garden-text-muted uppercase tracking-wide"
              >
                Mot de passe
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
              {loading ? "Plantation…" : "Planter ma première graine →"}
            </button>

            <p className="text-xs font-mono text-garden-text-muted text-center">
              En créant un compte, tu acceptes nos conditions d&apos;utilisation.
            </p>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm font-extralight text-garden-text-muted">
            Déjà un jardin ?{" "}
            <Link
              href="/auth/login"
              className="text-garden-green font-normal hover:underline underline-offset-2 transition-colors"
            >
              Me connecter
            </Link>
          </p>
        </div>
      </div>

      {/* Decorative bottom stripe */}
      <div className="h-1 bg-garden-green" />
    </div>
  );
}
