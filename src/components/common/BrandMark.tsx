interface BrandMarkProps {
  inverse?: boolean;
  compact?: boolean;
}

export default function BrandMark({ inverse = false, compact = false }: BrandMarkProps) {
  const ink = inverse ? "#F8F7F2" : "#2F3B34";
  const muted = inverse ? "#C9CEC9" : "#68776C";

  return (
    <span className="inline-flex items-center gap-3">
      <svg
        aria-hidden="true"
        className="size-9 shrink-0"
        viewBox="0 0 44 44"
        fill="none"
      >
        <circle cx="22" cy="22" r="21.5" stroke={muted} strokeOpacity=".42" />
        <path
          d="M12.5 28.5c4.1 2.6 11.9 2.7 16.7-.4 2.7-1.7 3.1-4.8 1.2-6.8-2.4-2.5-6.6-1.4-8 1.5-1.7-4.3-.3-8.2 4.2-11.3-5.3 1.4-8.4 5.1-8.3 10.2-2.2-1.1-4.7-.8-6.6.5"
          stroke={ink}
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m28.9 12.5 3.2-1.8-2 3" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="flex flex-col">
          <span className="font-editorial text-xl italic leading-none text-current">Baekjo Objet</span>
          <span className="mt-1 text-[9px] font-medium uppercase text-current opacity-60">
            Pet life curation
          </span>
        </span>
      )}
    </span>
  );
}
