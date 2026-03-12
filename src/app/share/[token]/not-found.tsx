export default function ShareNotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-garden-border">
        <a
          href="/"
          className="font-mono text-xs text-garden-text-muted hover:text-garden-green transition-colors"
        >
          🌿 The Garden
        </a>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <span
          className="text-6xl mb-8 leading-none select-none"
          style={{ opacity: 0.35 }}
          aria-hidden="true"
        >
          🍂
        </span>
        <h1 className="font-sans font-bold text-garden-black text-xl mb-3">
          Ce jardin n&apos;existe plus
        </h1>
        <p className="font-sans font-extralight text-garden-text-muted text-sm max-w-xs leading-relaxed mb-8">
          Le lien de partage a peut-être été désactivé ou n&apos;a jamais existé.
          Les jardins ont leur propre mémoire.
        </p>
        <a
          href="/"
          className="group inline-flex items-center gap-2 font-sans font-medium text-sm text-garden-green hover:underline transition-colors"
        >
          Cultiver ton propre jardin
          <span className="font-mono transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </a>
      </main>
    </div>
  );
}
