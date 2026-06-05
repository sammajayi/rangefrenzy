interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 48, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dark container */}
      <rect width="48" height="48" rx="11" fill="#0D1420" />

      {/* Faint price line running through the middle */}
      <line
        x1="4"
        y1="24"
        x2="44"
        y2="24"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Range zone fill */}
      <rect x="14" y="18" width="20" height="12" rx="2" fill="#07955F" opacity="0.18" />

      {/* Left bracket — vertical + serifs */}
      <line x1="14" y1="18" x2="14" y2="30" stroke="#07955F" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="18" x2="17.5" y2="18" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="14" y1="30" x2="17.5" y2="30" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      {/* Right bracket — vertical + serifs */}
      <line x1="34" y1="18" x2="34" y2="30" stroke="#07955F" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="18" x2="30.5" y2="18" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="34" y1="30" x2="30.5" y2="30" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      {/* Center hit dot — the prediction */}
      <circle cx="24" cy="24" r="4.5" fill="#07955F" />
      <circle cx="24" cy="24" r="2" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

export function LogoWordmark({
  className,
  iconSize = 32,
}: {
  className?: string;
  iconSize?: number;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Logo size={iconSize} />
      <span className="font-display text-xl font-bold tracking-tight">
        RangeFrenzy
      </span>
    </div>
  );
}
