// Tiny UI icons used in HUD + wall reactions. All inline SVG so they tint
// via currentColor and stay crisp at any size.

interface IconProps {
  size?: number;
  className?: string;
}

export function BrokenHeartIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 6.6c-1.8-2-4.5-2.4-6.4-0.7C3.5 8 3.7 11.4 6.2 14L11 18.8l-2.3-5 2.6-3 1.7 4 -0.5-2.1 0.6-2.1H8.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.6c1.8-2 4.5-2.4 6.4-0.7C20.5 8 20.3 11.4 17.8 14L13 18.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CandleIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* flame */}
      <path d="M12 3 Q 14 6 14 8 Q 14 10 12 10 Q 10 10 10 8 Q 10 6 12 3 Z" fill="currentColor" />
      {/* candle body */}
      <rect x="9.5" y="11" width="5" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {/* base */}
      <line x1="8.5" y1="20" x2="15.5" y2="20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function RoseIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* bud */}
      <path
        d="M 12 4 Q 8 5 7.5 8 Q 7 11 9 12 Q 10.5 13 12 12 Q 13.5 13 15 12 Q 17 11 16.5 8 Q 16 5 12 4 Z"
        fill="currentColor"
      />
      {/* stem */}
      <path d="M 12 12 L 12 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* leaf */}
      <path d="M 12 16 Q 16 15 17 17 Q 15 19 12 18 Z" fill="currentColor" />
    </svg>
  );
}

export function ShareIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M 12 4 L 12 16 M 12 4 L 8 8 M 12 4 L 16 8 M 5 14 L 5 20 L 19 20 L 19 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WallIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14.5" y="4.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14.5" y="13.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function BackIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M 14 5 L 7 12 L 14 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M 4 4 L 20 12 L 4 20 L 6.5 12 Z M 6.5 12 L 14 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FingerIcon({ size = 36, className }: IconProps) {
  // Material 'touch_app' (the canonical instant-play hint icon)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.39z"
        fill="currentColor"
      />
    </svg>
  );
}
