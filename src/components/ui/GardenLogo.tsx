interface GardenLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
}

export function GardenLogo({ size = "md", variant = "dark" }: GardenLogoProps) {
  const textSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  const dotColor = variant === "light" ? "bg-white" : "bg-garden-yellow";
  const textColor = variant === "light" ? "text-white" : "text-garden-black";

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Minimal leaf mark */}
      <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-garden-green shrink-0">
        <span
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${dotColor}`}
        />
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <path
            d="M2 10C2 10 3 4 9 2C9 2 9 8 2 10Z"
            fill="white"
            opacity="0.9"
          />
          <path
            d="M9 2L2 10"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>
      {/* Wordmark */}
      <span
        className={`font-sans font-bold tracking-tight ${textSize} ${textColor}`}
      >
        The Garden
      </span>
    </div>
  );
}
