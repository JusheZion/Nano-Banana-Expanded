import { useState } from 'react';
import { ImageOff } from 'lucide-react';

type VaultImageWithFallbackProps = {
  src: string;
  alt: string;
  /** Outer frame, e.g. `h-[280px]` */
  frameClassName: string;
  /** Classes for the `<img>` when load succeeds */
  imgClassName: string;
  /** Optional inline styles for `<img>` (e.g. objectPosition/transform). */
  imgStyle?: React.CSSProperties;
};

/**
 * Vault/archive thumbnail: shows a clear placeholder if the URL is stale (e.g. old `blob:` rows) or blocked.
 */
export function VaultImageWithFallback({
  src,
  alt,
  frameClassName,
  imgClassName,
  imgStyle,
}: VaultImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${frameClassName} flex flex-col items-center justify-center gap-2 bg-black/35 text-white/55 border-b border-white/5`}
        role="img"
        aria-label={alt ? `${alt} (image unavailable)` : 'Image unavailable'}
      >
        <ImageOff className="w-10 h-10 opacity-85 shrink-0" aria-hidden />
        <span className="text-xs text-center px-3">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      style={imgStyle}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
