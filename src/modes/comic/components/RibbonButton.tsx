import { memo, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { ACCENT_GOLD_GRADIENT, TEXT_ON_GOLD, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';

export const RIBBON_BUTTON_CLASS =
  'rounded-lg border border-white/20 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-[2.5rem] transition-all duration-150 shrink-0 hover:bg-[linear-gradient(45deg,#bf953f_0%,#fcf6ba_45%,#b38728_70%,#fbf5b7_85%,#aa771c_100%)] hover:text-[#000000] hover:border-white/30 active:scale-[0.98] active:shadow-inner';

interface RibbonButtonProps {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  title: string;
  className?: string;
  style?: CSSProperties;
  onClick: () => void;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const RibbonButton = memo(function RibbonButton({
  label,
  icon,
  active,
  disabled,
  title,
  className = '',
  style,
  onClick,
  onMouseDown,
}: RibbonButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      className={`${RIBBON_BUTTON_CLASS} ${className}`.trim()}
      style={style ?? (active
        ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }
        : { background: 'transparent', color: TEXT_ON_BLUE })}
      aria-pressed={active}
    >
      {icon}
      <span className="text-[9px] font-medium uppercase tracking-wide leading-tight">{label}</span>
    </button>
  );
});
