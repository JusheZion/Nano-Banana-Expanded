import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useArcsResolvedSrc } from '@/shared/hooks/useArcsResolvedSrc';

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
  const [retryCount, setRetryCount] = useState(0);
  const displaySrc = useArcsResolvedSrc(src);
  const canRetry = Boolean(displaySrc) && !displaySrc.startsWith('blob:') && !displaySrc.startsWith('data:');
  const retrySrc = canRetry && retryCount > 0
    ? `${displaySrc}${displaySrc.includes('?') ? '&' : '?'}arcsRetry=${retryCount}`
    : displaySrc;

  useEffect(() => {
    setFailed(false);
    setRetryCount(0);
  }, [src, displaySrc]);

  const handleError = () => {
    if (canRetry && retryCount < 2) {
      setRetryCount((count) => count + 1);
      return;
    }
    setFailed(true);
  };

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
    <div className={frameClassName}>
      <img
        src={retrySrc}
        alt={alt}
        className={imgClassName}
        style={imgStyle}
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
}
