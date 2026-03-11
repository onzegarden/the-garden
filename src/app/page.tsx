import Link from "next/link";
import { GardenLogo } from "@/components/ui/GardenLogo";

const features = [
  {
    label: "Images",
    desc: "Capture ce qui t'inspire visuellement — photos, illustrations, screenshots.",
    icon: "🌿",
  },
  {
    label: "Textes",
    desc: "Citations, extraits, fragments de pensée. Les mots qui restent.",
    icon: "📖",
  },
  {
    label: "Liens",
    desc: "Articles, projets, références. Un espace pour tout garder.",
    icon: "🔗",
  },
  {
    label: "Vidéos",
    desc: "Conférences, films, courts-métrages. Rien ne se perd.",
    icon: "▶",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* ─── Nav ─── */}
      <nav className="px-6 md:px-12 py-6 flex items-center justify-between border-b border-garden-border">
        <GardenLogo />
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-sans text-garden-text-muted hover:text-garden-black transition-colors duration-200 px-4 py-2"
          >
            Connexion
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm">
            Commencer
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-36">
        <div className="animate-fade-up max-w-3xl mx-auto">
          {/* Badge */}
          <span className="inline-block font-mono text-xs text-garden-green bg-garden-green-muted border border-garden-border px-3 py-1 rounded-tag mb-8 tracking-wide">
            Personal inspiration space
          </span>

          {/* Headline */}
          <h1 className="text-display-xl font-sans font-bold text-garden-black leading-[1.08] tracking-tight mb-6 text-balance">
            Cultive tes{" "}
            <span className="relative inline-block">
              <span className="relative z-10">inspirations</span>
              <span
                className="absolute bottom-1 left-0 right-0 h-3 bg-garden-yellow -z-0 opacity-60"
                aria-hidden="true"
              />
            </span>
            .
          </h1>

          {/* Sub */}
          <p className="text-lg md:text-xl font-sans font-extralight text-garden-text-muted max-w-xl mx-auto leading-relaxed mb-12">
            Un espace intime et calme pour collecter ce qui t&apos;inspire — images,
            textes, liens, vidéos. Tes idées ne sont pas stockées, elles sont
            cultivées.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup" className="btn-primary text-base px-7 py-3">
              Planter ma première graine →
            </Link>
            <Link href="/auth/login" className="btn-secondary text-base px-7 py-3">
              J&apos;ai déjà un jardin
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features grid ─── */}
      <section className="px-6 md:px-12 pb-24">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-xs text-garden-text-muted uppercase tracking-widest text-center mb-10">
            Ce que tu peux collecter
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div
                key={f.label}
                className="bg-garden-green-light border border-garden-border rounded-card p-5 flex flex-col gap-3 hover:border-garden-green transition-all duration-200 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-sans font-bold text-garden-black text-sm mb-1">
                    {f.label}
                  </p>
                  <p className="font-sans font-extralight text-garden-text-muted text-xs leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Manifesto strip ─── */}
      <section className="bg-garden-green py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="font-sans font-extralight text-white text-xl md:text-2xl leading-relaxed mb-8 text-balance">
            &ldquo;L&apos;inspiration n&apos;est pas un accident.{" "}
            <em className="font-normal not-italic text-garden-yellow">
              C&apos;est un jardin qu&apos;on cultive.
            </em>
            &rdquo;
          </p>
          <Link href="/auth/signup" className="btn-primary text-sm px-6 py-2.5">
            Créer mon jardin — c&apos;est gratuit
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 py-8 border-t border-garden-border flex items-center justify-between">
        <GardenLogo size="sm" />
        <p className="font-mono text-xs text-garden-text-muted">
          © {new Date().getFullYear()} The Garden
        </p>
      </footer>
    </main>
  );
}
