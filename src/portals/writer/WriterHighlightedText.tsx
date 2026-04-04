import React, { useEffect, useRef } from 'react';
import { escapeRegExp } from '@/portals/writer/writerSearch';

type Props = {
  text: string;
  query: string;
  activeMatchIndex: number;
  className?: string;
};

/**
 * Renders plain text with find highlights; scrolls active match into view.
 */
export const WriterHighlightedText: React.FC<Props> = ({ text, query, activeMatchIndex, className }) => {
  const activeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeMatchIndex, query]);

  const q = query.trim();
  if (!q) {
    return <span className={className}>{text}</span>;
  }

  const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
  const parts = text.split(re);
  let matchCounter = 0;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMatch = i % 2 === 1;
        if (!isMatch) return <React.Fragment key={i}>{part}</React.Fragment>;
        const idx = matchCounter++;
        const active = idx === activeMatchIndex;
        return (
          <mark
            key={i}
            ref={(el) => {
              if (active) activeRef.current = el;
            }}
            className={
              active
                ? 'bg-amber-400/90 text-black ring-2 ring-amber-600 rounded-sm px-0.5'
                : 'bg-amber-200/80 text-black rounded-sm px-0.5'
            }
          >
            {part}
          </mark>
        );
      })}
    </span>
  );
};
