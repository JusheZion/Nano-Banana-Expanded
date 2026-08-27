import { useMemo } from 'react';
import type { FragmentDef } from '../data/FragmentRegistry';
import { getSigil } from '../data/SigilRegistry';
import { plateTextureDataUri } from '../data/plateTextures';
import { SigilGlyph } from './SigilGlyph';

interface FragmentPreviewProps {
  fragment: FragmentDef;
  /** Box the preview is fitted into, in px. */
  width: number;
  height: number;
  tint: string;
}

/**
 * A schematic thumbnail: the fragment's objects scaled into the box as plain
 * DOM, with real marks for sigils and blocks standing in for text and charts.
 *
 * Deliberately not a Konva stage — the palette can show fifty of these at once,
 * and fifty stages would cost fifty canvases for thumbnails nobody edits.
 */
export function FragmentPreview({ fragment, width, height, tint }: FragmentPreviewProps) {
  const objects = useMemo(() => fragment.build(0, 0), [fragment]);

  // Plate-target fragments (grounds) add no objects, so preview the treatment
  // they apply to the plate instead of an empty box.
  if (fragment.plate) {
    const g = fragment.plate.backgroundGradient;
    const gradientCss = g
      ? g.type === 'radial'
        ? `radial-gradient(circle, ${g.stops.map((s) => s.color).join(', ')})`
        : `linear-gradient(${(g.angle ?? 90) + 90}deg, ${g.stops.map((s) => s.color).join(', ')})`
      : fragment.plate.background;
    // Textured grounds preview the actual surface, not just the colour under it —
    // a parchment tile that showed only the beige would misrepresent it.
    const textureUri = fragment.plate.backgroundTexture
      ? plateTextureDataUri(fragment.plate.backgroundTexture, width * 3, height * 3)
      : null;
    return (
      <div
        aria-hidden="true"
        className="rounded-sm"
        style={{
          width,
          height,
          background: gradientCss,
          backgroundImage: textureUri
            ? `url("${textureUri}"), ${gradientCss}`
            : gradientCss,
          backgroundSize: 'cover',
        }}
      />
    );
  }

  const scale = Math.min(width / fragment.width, height / fragment.height);
  const offsetX = (width - fragment.width * scale) / 2;
  const offsetY = (height - fragment.height * scale) / 2;

  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-sm bg-black/40"
      style={{ width, height }}
    >
      {objects.map((obj) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: offsetX + obj.x * scale,
          top: offsetY + obj.y * scale,
          width: Math.max(1, obj.width * scale),
          height: Math.max(1, obj.height * scale),
          opacity: obj.opacity,
        };

        if (obj.kind === 'sigil') {
          const sigil = getSigil(obj.sigilId);
          if (!sigil) return null;
          return (
            <div key={obj.id} style={style}>
              <SigilGlyph sigil={sigil} size={Math.max(4, obj.width * scale)} color={tint} />
            </div>
          );
        }

        if (obj.kind === 'text') {
          return (
            <div
              key={obj.id}
              style={{
                ...style,
                background: obj.fill,
                opacity: (obj.opacity ?? 1) * 0.5,
                borderRadius: 1,
              }}
            />
          );
        }

        if (obj.kind === 'chart') {
          return (
            <div
              key={obj.id}
              style={{
                ...style,
                border: `1px solid ${obj.stroke}`,
                background: `linear-gradient(90deg, ${obj.fill} 0%, ${obj.fill} 55%, transparent 55%)`,
                opacity: 0.7,
              }}
            />
          );
        }

        if (obj.kind !== 'frame') return null; // images are never built by fragments

        const grad = obj.fillGradient;
        const background = grad
          ? `linear-gradient(${(grad.angle ?? 90) + 90}deg, ${grad.stops
              .map((s) => s.color)
              .join(', ')})`
          : obj.fill;
        return (
          <div
            key={obj.id}
            style={{
              ...style,
              background,
              border: obj.strokeWidth ? `1px solid ${obj.stroke}` : undefined,
              borderStyle: obj.variant === 'dashed' ? 'dashed' : 'solid',
              borderRadius: Math.min(6, obj.cornerRadius * scale),
            }}
          />
        );
      })}
    </div>
  );
}
