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
      <rect width="48" height="48" rx="10" fill="#0D1420" />

      {/* Range zone fill */}
      <rect x="13" y="17" width="22" height="14" rx="2.5" fill="#07955F" opacity="0.15" />

      {/* Left bracket */}
      <line x1="14" y1="16" x2="14" y2="32" stroke="#07955F" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="14" y1="16" x2="18" y2="16" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <line x1="14" y1="32" x2="18" y2="32" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

      {/* Right bracket */}
      <line x1="34" y1="16" x2="34" y2="32" stroke="#07955F" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="34" y1="16" x2="30" y2="16" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <line x1="34" y1="32" x2="30" y2="32" stroke="#07955F" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

      {/* Bonding curve — upward trending through the range zone */}
      <polyline
        points="15,31 19,27.5 24,24 29,21.5 33,20"
        stroke="#07955F"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />

      {/* Prediction hit dot */}
      <circle cx="24" cy="24" r="4" fill="#07955F" />
      <circle cx="24" cy="24" r="1.8" fill="white" opacity="0.92" />
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
