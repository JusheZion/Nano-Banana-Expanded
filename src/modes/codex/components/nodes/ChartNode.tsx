import { Arc, Circle, Group, Line, Rect, Text } from 'react-konva';
import type { CodexChartObject } from '../../types/codexObjects';
import { nodeEffectProps } from '../../utils/nodeEffects';
import { radarGeometry, clampAxisValue } from '../../utils/chartGeometry';

interface ChartNodeProps {
  object: CodexChartObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  onChange: (patch: Partial<CodexChartObject>) => void;
  registerRef: (node: unknown | null) => void;
}

/**
 * Stat charts as live objects: change a value and the geometry redraws.
 * Four kinds cover what the codex plates use — radar, bar meters, segmented
 * pips and a single radial dial.
 */
export function ChartNode({ object, onSelect, onChange, registerRef }: ChartNodeProps) {
  return (
    <Group
      ref={registerRef as never}
      id={object.id}
      name="codex-object"
      x={object.x}
      y={object.y}
      width={object.width}
      height={object.height}
      rotation={object.rotation}
      opacity={object.opacity}
      visible={object.visible}
      listening={!object.locked}
      draggable={!object.locked}
      onMouseDown={onSelect as never}
      onTap={onSelect as never}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(60, object.width * scaleX),
          height: Math.max(60, object.height * scaleY),
          rotation: node.rotation(),
        });
      }}
      {...nodeEffectProps(object)}
    >
      {/* A chart is mostly empty space between its lines, so without a hit
          surface only the strokes themselves could be clicked. Transparent so it
          changes nothing visually; it exists purely to be grabbable. */}
      <Rect width={object.width} height={object.height} fill="transparent" />

      {object.chartKind === 'radial' && <RadarBody object={object} />}
      {object.chartKind === 'bars' && <BarsBody object={object} />}
      {object.chartKind === 'pips' && <PipsBody object={object} />}
      {object.chartKind === 'dial' && <DialBody object={object} />}
    </Group>
  );
}

function RadarBody({ object }: { object: CodexChartObject }) {
  const geo = radarGeometry(object);
  return (
    <>
      {geo.rings.map((ring, i) => (
        <Line key={`ring-${i}`} points={ring} closed stroke={object.track} strokeWidth={1} />
      ))}
      {geo.spokes.map((spoke, i) => (
        <Line key={`spoke-${i}`} points={spoke} stroke={object.track} strokeWidth={1} opacity={0.7} />
      ))}
      <Line points={geo.polygon} closed fill={object.fill} stroke={object.stroke} strokeWidth={2} />
      {geo.vertices.map((v, i) => (
        <Circle key={`v-${i}`} x={v.x} y={v.y} radius={3.5} fill={object.stroke} />
      ))}
      {object.showLabels &&
        geo.labels.map((l, i) => (
          <Text
            key={`l-${i}`}
            x={l.x - 60}
            y={l.y}
            width={120}
            align="center"
            text={l.label}
            fontFamily={object.fontFamily}
            fontSize={object.fontSize}
            letterSpacing={1.2}
            fill={object.labelColor}
          />
        ))}
      {object.showValues &&
        geo.labels.map((l, i) => (
          <Text
            key={`val-${i}`}
            x={l.x - 60}
            y={l.y + object.fontSize + 3}
            width={120}
            align="center"
            text={String(l.value)}
            fontFamily={object.fontFamily}
            fontSize={object.fontSize * 1.5}
            fill={object.stroke}
          />
        ))}
    </>
  );
}

function BarsBody({ object }: { object: CodexChartObject }) {
  const rowH = object.height / Math.max(object.axes.length, 1);
  const barH = Math.min(10, rowH * 0.3);
  const max = Math.max(object.max, 1);
  return (
    <>
      {object.axes.map((axis, i) => {
        const value = clampAxisValue(axis.value, object.max);
        const top = i * rowH;
        const barY = top + rowH - barH - 2;
        return (
          <Group key={`${axis.label}-${i}`}>
            {object.showLabels && (
              <Text
                x={0}
                y={top}
                text={axis.label}
                fontFamily={object.fontFamily}
                fontSize={object.fontSize}
                letterSpacing={1}
                fill={object.labelColor}
              />
            )}
            {object.showValues && (
              <Text
                x={object.width - 60}
                y={top}
                width={60}
                align="right"
                text={String(axis.value)}
                fontFamily={object.fontFamily}
                fontSize={object.fontSize}
                fill={object.stroke}
              />
            )}
            <Rect
              x={0}
              y={barY}
              width={object.width}
              height={barH}
              cornerRadius={barH / 2}
              fill={object.track}
            />
            <Rect
              x={0}
              y={barY}
              width={(object.width * value) / max}
              height={barH}
              cornerRadius={barH / 2}
              fill={object.stroke}
            />
          </Group>
        );
      })}
    </>
  );
}

function PipsBody({ object }: { object: CodexChartObject }) {
  const segments = Math.max(1, Math.round(object.segments ?? 10));
  const rowH = object.height / Math.max(object.axes.length, 1);
  const gap = 4;
  const pipW = (object.width - gap * (segments - 1)) / segments;
  const pipH = Math.min(10, rowH * 0.3);
  const max = Math.max(object.max, 1);

  return (
    <>
      {object.axes.map((axis, i) => {
        const value = clampAxisValue(axis.value, object.max);
        const filled = Math.round((value / max) * segments);
        const top = i * rowH;
        const pipY = top + rowH - pipH - 2;
        return (
          <Group key={`${axis.label}-${i}`}>
            {object.showLabels && (
              <Text
                x={0}
                y={top}
                text={axis.label}
                fontFamily={object.fontFamily}
                fontSize={object.fontSize}
                letterSpacing={1}
                fill={object.labelColor}
              />
            )}
            {Array.from({ length: segments }, (_, s) => (
              <Rect
                key={s}
                x={s * (pipW + gap)}
                y={pipY}
                width={pipW}
                height={pipH}
                fill={s < filled ? object.stroke : object.track}
              />
            ))}
          </Group>
        );
      })}
    </>
  );
}

function DialBody({ object }: { object: CodexChartObject }) {
  const axis = object.axes[0] ?? { label: '', value: 0 };
  const value = clampAxisValue(axis.value, object.max);
  const size = Math.min(object.width, object.height);
  const cx = object.width / 2;
  const cy = object.height / 2;
  const radius = size / 2 - 8;
  const thickness = Math.max(6, size * 0.09);
  const max = Math.max(object.max, 1);

  return (
    <>
      <Arc
        x={cx}
        y={cy}
        innerRadius={radius - thickness}
        outerRadius={radius}
        angle={360}
        fill={object.track}
      />
      <Arc
        x={cx}
        y={cy}
        innerRadius={radius - thickness}
        outerRadius={radius}
        angle={(value / max) * 360}
        rotation={-90}
        fill={object.stroke}
      />
      {object.showValues && (
        <Text
          x={cx - radius}
          y={cy - object.fontSize}
          width={radius * 2}
          align="center"
          text={String(axis.value)}
          fontFamily={object.fontFamily}
          fontSize={object.fontSize * 2}
          fill={object.stroke}
        />
      )}
      {object.showLabels && axis.label && (
        <Text
          x={cx - radius}
          y={cy + object.fontSize}
          width={radius * 2}
          align="center"
          text={axis.label}
          fontFamily={object.fontFamily}
          fontSize={object.fontSize}
          letterSpacing={1.2}
          fill={object.labelColor}
        />
      )}
    </>
  );
}
