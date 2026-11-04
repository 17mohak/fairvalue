// The FairValue mark: a halfway line through the centre circle, read as a balance.
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="1.5" x2="12" y2="22.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.9" fill="var(--flood)" />
    </svg>
  );
}
