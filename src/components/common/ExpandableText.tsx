'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useId, useState } from 'react';

interface ExpandableTextProps {
  text: string;
  className?: string;
  collapsedLines?: 2 | 3;
  previewThreshold?: number;
}

const clampClasses = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
} as const;

export default function ExpandableText({
  text,
  className = '',
  collapsedLines = 3,
  previewThreshold = 90,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const canExpand = text.trim().length > previewThreshold;

  return (
    <div data-expandable-text>
      <p
        id={contentId}
        className={`${className} ${canExpand && !isExpanded ? clampClasses[collapsedLines] : ''}`}
      >
        {text}
      </p>
      {canExpand && (
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#E7E0D5] bg-white px-4 text-[12px] font-semibold text-[#6F766F] transition-colors hover:border-[#D8C4A3] hover:text-[#17211D]"
        >
          {isExpanded ? (
            <>
              접기 <ChevronUp className="size-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              더 보기 <ChevronDown className="size-3.5" aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
