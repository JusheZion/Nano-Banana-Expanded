import { memo, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return undefined;
    }

    setSeconds(0);
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [active]);

  return seconds;
}

interface GuidedProgressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingLabel: string;
  idleLabel: string;
  icon?: ReactNode;
}

export const GuidedProgressButton = memo(function GuidedProgressButton({
  isLoading,
  loadingLabel,
  idleLabel,
  icon,
  className = '',
  children,
  ...buttonProps
}: GuidedProgressButtonProps) {
  const elapsedSeconds = useElapsedSeconds(isLoading);
  const label = isLoading ? `${loadingLabel} ${formatElapsed(elapsedSeconds)}` : idleLabel;

  return (
    <button
      {...buttonProps}
      aria-busy={isLoading || undefined}
      className={`guided-progress-button ${className}`}
      data-loading={isLoading ? 'true' : 'false'}
    >
      <span className="guided-progress-button__content inline-flex min-w-0 items-center justify-center gap-2">
        {icon}
        <span className="min-w-0">{children ?? label}</span>
      </span>
    </button>
  );
});
