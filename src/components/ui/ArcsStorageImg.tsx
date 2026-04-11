import type { ImgHTMLAttributes } from 'react';
import { useArcsResolvedSrc } from '@/shared/hooks/useArcsResolvedSrc';

type ArcsStorageImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

/**
 * <img> that resolves private `arcs-generations` URLs to signed URLs. Pass-through for other src values.
 */
export function ArcsStorageImg({ src, ...rest }: ArcsStorageImgProps) {
  const resolved = useArcsResolvedSrc(src);
  return <img {...rest} src={resolved} />;
}
