import React, { useMemo, useState } from 'react';
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  LayoutTemplate,
  Palette,
  PanelTop,
  Rocket,
  Sparkles,
} from 'lucide-react';
import {
  ACCENT_BLUE_GRADIENT,
  ACCENT_GOLD_GRADIENT,
  ACCENT_GOLD_LIGHT,
  ACCENT_GOLD_SOLID,
  PRIMARY_BG,
  PRIMARY_BG_DARK,
  PRIMARY_BG_FLAT,
  TEXT_ON_BLUE,
  TEXT_ON_GOLD,
} from '@/shared/theme/Phase12DesignTokens';
import { Tooltip } from '@/shared/components/Tooltip';

type GuidedComicStepId =
  | 'setup'
  | 'story'
  | 'pages'
  | 'visual-prep'
  | 'art'
  | 'layout'
  | 'export';

type GuidedComicStep = {
  id: GuidedComicStepId;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  placeholder: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const STEPS: GuidedComicStep[] = [
  {
    id: 'setup',
    label: 'Setup',
    eyebrow: 'Start here',
    title: 'Choose the shape of the comic',
    summary: 'Set the format, tone, audience, and working title before any panels are created.',
    placeholder: 'Placeholder: project name, issue type, reading format, page size, and target length controls.',
    Icon: Rocket,
  },
  {
    id: 'story',
    label: 'Story',
    eyebrow: 'Script foundation',
    title: 'Bring in the story spine',
    summary: 'Capture the synopsis, outline, page beats, or script context that will guide the rest of the workflow.',
    placeholder: 'Placeholder: synopsis field, Writers Workshop import, page beat review, and dialogue draft handoff.',
    Icon: BookOpenText,
  },
  {
    id: 'pages',
    label: 'Pages',
    eyebrow: 'Structure',
    title: 'Plan pages and panel density',
    summary: 'Decide how many pages are needed and where big moments deserve more space.',
    placeholder: 'Placeholder: page list, spread moments, cover toggle, and panel-count suggestions.',
    Icon: PanelTop,
  },
  {
    id: 'visual-prep',
    label: 'Visual Prep',
    eyebrow: 'Reference pass',
    title: 'Gather characters, locations, and props',
    summary: 'Review what should come from the Image Vault and what still needs reference art.',
    placeholder: 'Placeholder: vault matches, missing recurring refs, quick refs, and Imageshop prep queue.',
    Icon: ImagePlus,
  },
  {
    id: 'art',
    label: 'Art',
    eyebrow: 'Image creation',
    title: 'Create or select panel artwork',
    summary: 'Move from prepared references into art selection for the pages that need images.',
    placeholder: 'Placeholder: art checklist, generation status, selected vault images, and panel art assignments.',
    Icon: Palette,
  },
  {
    id: 'layout',
    label: 'Layout',
    eyebrow: 'Comic assembly',
    title: 'Arrange panels, balloons, and pacing',
    summary: 'Use the guided plan to enter layout work, then refine in the advanced comic editor when needed.',
    placeholder: 'Placeholder: layout preview, panel template suggestions, balloon checklist, and advanced editor entry.',
    Icon: LayoutTemplate,
  },
  {
    id: 'export',
    label: 'Export',
    eyebrow: 'Finish',
    title: 'Review and publish the issue',
    summary: 'Check pages, confirm export format, and prepare the comic for download or sharing.',
    placeholder: 'Placeholder: review checklist, missing art warnings, PNG/PDF options, and export readiness.',
    Icon: Download,
  },
];

interface GuidedComicFlowProps {
  onOpenAdvancedStudio: () => void;
}

export function GuidedComicFlow({ onOpenAdvancedStudio }: GuidedComicFlowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = STEPS[activeIndex];
  const progress = useMemo(() => ((activeIndex + 1) / STEPS.length) * 100, [activeIndex]);
  const atStart = activeIndex === 0;
  const atEnd = activeIndex === STEPS.length - 1;

  const goBack = () => setActiveIndex((index) => Math.max(0, index - 1));
  const goNext = () => setActiveIndex((index) => Math.min(STEPS.length - 1, index + 1));

  return (
    <div
      className="min-h-full w-full overflow-y-auto custom-scrollbar text-white"
      style={{ background: PRIMARY_BG }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <header
          className="overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY_BG_FLAT} 0%, ${PRIMARY_BG_DARK} 62%, #1b2450 100%)`,
            borderColor: `${ACCENT_GOLD_SOLID}66`,
          }}
        >
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-end lg:justify-between lg:p-7">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT_GOLD_LIGHT }} aria-hidden />
                Guided Comic Flow
              </div>
              <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
                Create a comic without starting from a blank canvas
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Move through a calm planning path for story, references, art, layout, and export before opening the
                full comic canvas.
              </p>
            </div>
            <Tooltip content="Open the current full Comics Studio editor">
              <button
                type="button"
                onClick={onOpenAdvancedStudio}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
              >
                <LayoutTemplate className="h-4 w-4" aria-hidden />
                Open Advanced Comics Studio
              </button>
            </Tooltip>
          </div>
          <div className="h-1.5 w-full bg-black/35">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, background: ACCENT_GOLD_GRADIENT }}
              aria-hidden
            />
          </div>
        </header>

        <nav
          className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 shadow-xl backdrop-blur-sm md:grid-cols-7"
          aria-label="Guided comic steps"
        >
          {STEPS.map((step, index) => {
            const selected = index === activeIndex;
            const complete = index < activeIndex;
            const StepIcon = step.Icon;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="flex min-h-[4.5rem] items-center gap-3 rounded-xl border px-3 py-2 text-left transition hover:bg-white/10 md:flex-col md:items-start md:gap-2"
                style={{
                  background: selected ? ACCENT_BLUE_GRADIENT : complete ? 'rgba(252,246,186,0.08)' : 'transparent',
                  borderColor: selected ? ACCENT_GOLD_SOLID : 'rgba(255,255,255,0.12)',
                  color: selected ? TEXT_ON_BLUE : 'rgba(255,255,255,0.78)',
                }}
                aria-current={selected ? 'step' : undefined}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    background: selected || complete ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.06)',
                    borderColor: selected || complete ? ACCENT_GOLD_SOLID : 'rgba(255,255,255,0.16)',
                    color: selected || complete ? TEXT_ON_GOLD : 'rgba(255,255,255,0.8)',
                  }}
                >
                  <StepIcon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
                    Step {index + 1}
                  </span>
                  <span className="block truncate text-sm font-bold">{step.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-xl backdrop-blur-md lg:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  {activeStep.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white md:text-4xl">
                  {activeStep.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                  {activeStep.summary}
                </p>
              </div>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-lg"
                style={{ background: ACCENT_GOLD_GRADIENT, borderColor: ACCENT_GOLD_SOLID, color: TEXT_ON_GOLD }}
              >
                <activeStep.Icon className="h-7 w-7" aria-hidden />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-white/20 bg-black/25 p-5">
              <p className="text-sm font-semibold text-white/90">{activeStep.placeholder}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Input</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">
                    Space reserved for user choices, imports, and review fields.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Guidance</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">
                    Space reserved for plain-language prompts and next-step suggestions.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Output</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">
                    Space reserved for generated plans, checklists, and handoff summaries.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={atStart}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
              <div className="text-center text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                {activeIndex + 1} of {STEPS.length}
              </div>
              <button
                type="button"
                onClick={goNext}
                disabled={atEnd}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-lg transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
              Current pass
            </p>
            <h3 className="mt-2 text-lg font-black text-white">Low-risk shell only</h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/65">
              <li>No new portal route.</li>
              <li>Plan first, refine later.</li>
              <li>Steps stay lightweight.</li>
              <li>Advanced editor remains one click away.</li>
            </ul>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold text-white/85">Ready for precision work?</p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                Open the full studio when you are ready to work directly on the canvas.
              </p>
              <button
                type="button"
                onClick={onOpenAdvancedStudio}
                className="mt-4 w-full rounded-lg px-3 py-2 text-xs font-black"
                style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
              >
                Open Advanced Comics Studio
              </button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
