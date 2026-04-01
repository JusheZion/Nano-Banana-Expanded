import React, { useEffect, useRef, useState } from 'react';
import { Group, Layer, Rect, Stage, Text } from 'react-konva';

const FRAME_W = 48;
const FRAME_H = 72;
const GAP = 6;
const PAD = 10;
const STAGE_H = FRAME_H + 36;

type Props = {
  shotPlanJson: Record<string, unknown> | null;
};

/**
 * Minimal Konva strip: one frame per shot (index + type). Horizontal scroll when many shots.
 */
export const WriterShotStoryboardStrip: React.FC<Props> = ({ shotPlanJson }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(640);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewW(Math.max(280, el.clientWidth || 640));
    });
    ro.observe(el);
    setViewW(Math.max(280, el.clientWidth || 640));
    return () => ro.disconnect();
  }, []);

  const shotsRaw = shotPlanJson?.shots;
  const shots = Array.isArray(shotsRaw) ? shotsRaw : [];

  if (shots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/20 bg-black/[0.04] px-4 py-6 text-center">
        <p className="text-[11px] text-black/50">Generate a shot plan to see a Konva frame strip here.</p>
      </div>
    );
  }

  const stageW = Math.max(viewW, PAD * 2 + shots.length * (FRAME_W + GAP) - GAP);

  return (
    <div ref={wrapRef} className="w-full overflow-x-auto custom-scrollbar rounded-xl border border-black/15 bg-[#2a2820] p-2">
      <Stage width={stageW} height={STAGE_H}>
        <Layer>
          {shots
            .map((row, i) => ({ row, i }))
            .filter((x): x is { row: Record<string, unknown>; i: number } => Boolean(x.row) && typeof x.row === 'object')
            .map(({ row: o, i }, layoutIndex) => {
            const idx = typeof o.shot_index === 'number' ? o.shot_index : i + 1;
            const st = typeof o.shot_type === 'string' ? o.shot_type.slice(0, 10) : '—';
            const x = PAD + layoutIndex * (FRAME_W + GAP);
            return (
              <Group key={`${idx}-${i}`}>
                <Rect
                  x={x}
                  y={8}
                  width={FRAME_W}
                  height={FRAME_H}
                  cornerRadius={4}
                  fill="#1a1814"
                  stroke="#c9a227"
                  strokeWidth={1}
                />
                <Text
                  x={x}
                  y={12}
                  width={FRAME_W}
                  text={`${idx}`}
                  fontSize={11}
                  fontStyle="bold"
                  fill="#f5e6b8"
                  align="center"
                />
                <Text
                  x={x + 4}
                  y={28}
                  width={FRAME_W - 8}
                  text={st}
                  fontSize={9}
                  fill="#a89b7a"
                  align="center"
                  ellipsis
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
      <p className="text-[10px] text-[#a89b7a] px-1 pt-1">
        Konva preview — drag scroll on narrow viewports. Thumbnails can replace rects later.
      </p>
    </div>
  );
};
