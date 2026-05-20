import type { ReactNode } from 'react';
import { Image, List, Maximize2, Sparkles } from 'lucide-react';
import type { GuidedComicVaultTarget } from '@/stores/guidedComicVaultBridge';

export type VaultPreviewMode = 'compact' | 'large';
export type VaultModalSizeMode = 'fit' | 'wide';

export const VAULT_CARD_INTERACTION =
  'transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#FBBF24]/55 hover:shadow-[0_16px_50px_rgba(0,0,0,0.34),0_0_0_1px_rgba(212,175,55,0.10)]';

export function getVaultAlbumLayout(mode: VaultPreviewMode) {
  return mode === 'compact'
    ? {
        grid: 'grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-2.5',
        card: 'grid min-h-[112px] grid-cols-[96px_minmax(0,1fr)]',
        frame: 'h-full min-h-[112px] w-full',
        image: 'h-full min-h-[112px]',
        body: 'relative z-10 flex min-w-0 flex-col justify-between p-2.5',
        title:
          'mt-1 line-clamp-2 break-words text-sm font-semibold leading-snug tracking-wide',
        meta: 'mt-1 text-xs',
      }
    : {
        grid: 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6',
        card: '',
        frame: 'h-[320px] w-full',
        image: 'h-[320px]',
        body: 'relative z-10 border-t border-[#D4AF37]/15 p-4',
        title:
          'mt-1 line-clamp-2 min-h-[3rem] break-words text-xl font-semibold leading-tight tracking-wide',
        meta: 'mt-1 text-sm',
      };
}

export function getVaultModalLayout(mode: VaultPreviewMode, size: VaultModalSizeMode) {
  if (mode === 'compact') {
    return size === 'wide'
      ? {
          grid: 'grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-3',
          card: 'grid min-h-[116px] grid-cols-[132px_minmax(0,1fr)]',
          frame: 'h-full min-h-[116px] aspect-[4/3]',
          body: 'p-2.5',
          title: 'line-clamp-2 min-h-[2rem] break-words text-[13px] font-bold leading-snug',
          actionMargin: 'mt-2',
        }
      : {
          grid: 'grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-2.5',
          card: 'grid min-h-[104px] grid-cols-[96px_minmax(0,1fr)]',
          frame: 'h-full min-h-[104px] aspect-square',
          body: 'p-2.5',
          title: 'line-clamp-2 min-h-[2rem] break-words text-[13px] font-bold leading-snug',
          actionMargin: 'mt-2',
        };
  }

  return size === 'wide'
    ? {
        grid: 'grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5',
        card: 'flex flex-col',
        frame: 'aspect-[16/10]',
        body: 'p-3',
        title: 'line-clamp-2 min-h-[2.25rem] break-words text-sm font-bold leading-snug',
        actionMargin: 'mt-3',
      }
    : {
        grid: 'grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3',
        card: 'flex flex-col',
        frame: 'aspect-[3/4]',
        body: 'p-3',
        title: 'line-clamp-2 min-h-[2.25rem] break-words text-sm font-bold leading-snug',
        actionMargin: 'mt-3',
      };
}

export function parseGuidedPanelTarget(target: GuidedComicVaultTarget | null | undefined): {
  pageNumber?: number;
  panelNumber?: number;
} {
  const match = target?.name.match(/page-(\d+)-panel-(\d+)/i);
  if (!match) return {};
  return {
    pageNumber: Number.parseInt(match[1], 10),
    panelNumber: Number.parseInt(match[2], 10),
  };
}

export function guidedTargetTypeLabel(type: GuidedComicVaultTarget['type']): string {
  switch (type) {
    case 'character':
      return 'Character reference';
    case 'location':
      return 'Location / asset reference';
    case 'prop':
      return 'Prop / asset reference';
    case 'npc':
      return 'NPC reference';
    case 'panel-art':
      return 'Panel art image';
  }
}

export function GuidedVaultModePanel(props: {
  target: GuidedComicVaultTarget;
  onCancel: () => void;
}) {
  const { target, onCancel } = props;
  const panel = parseGuidedPanelTarget(target);

  return (
    <section className="sticky top-3 z-30 mx-auto mb-5 max-w-7xl rounded-xl border border-amber-300/35 bg-[#06111f]/95 px-4 py-3 text-amber-50 shadow-2xl shadow-black/35 backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/75">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Guided Mode
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
            <span>{guidedTargetTypeLabel(target.type)}</span>
            {panel.pageNumber ? (
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/70">
                Page {panel.pageNumber}
                {panel.panelNumber ? `, Panel ${panel.panelNumber}` : ''}
              </span>
            ) : null}
            <span className="min-w-0 truncate rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">
              {target.name}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/65">
            Choose a reference image, then use the highlighted guided action in the card action bar.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] px-3 text-xs font-semibold text-amber-100/80 transition hover:bg-white/10 hover:text-amber-50"
        >
          Cancel and return
        </button>
      </div>
    </section>
  );
}

export function VaultViewModeToggle(props: {
  value: VaultPreviewMode;
  onChange: (value: VaultPreviewMode) => void;
}) {
  const { value, onChange } = props;
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-black/25 p-1">
      {[
        { id: 'compact' as const, label: 'Compact', Icon: List },
        { id: 'large' as const, label: 'Large', Icon: Image },
      ].map(({ id, label, Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition',
              selected ? 'bg-amber-300 text-black' : 'text-white/65 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function VaultActionIconButton(props: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}) {
  const { label, children, onClick, disabled, danger, active } = props;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'border-red-300/35 bg-red-500/10 text-red-100 hover:bg-red-500/20'
          : active
            ? 'border-amber-200/70 bg-amber-300/20 text-amber-50'
            : 'border-white/15 bg-black/45 text-white/78 hover:border-amber-200/45 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function VaultOpenLink(props: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noreferrer"
      aria-label={props.label}
      title={props.label}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/15 bg-black/45 px-2 text-xs font-bold text-white/78 transition hover:border-amber-200/45 hover:bg-white/10 hover:text-white"
    >
      <Maximize2 className="h-4 w-4" aria-hidden />
    </a>
  );
}
