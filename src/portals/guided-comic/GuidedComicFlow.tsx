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
  helperText: string;
  actionLabel: string;
  workflowCards: {
    title: string;
    body: string;
  }[];
  Icon: React.ComponentType<{ className?: string }>;
};

type SetupFormState = {
  seriesTitle: string;
  issueTitle: string;
  issueNumber: string;
  targetPageCount: string;
  genre: string;
  tone: string;
  premise: string;
};

const GENRE_OPTIONS = [
  'Superhero',
  'Fantasy',
  'Sci-fi',
  'Mystery',
  'Slice of life',
  'Horror',
  'Romance',
  'Adventure',
  'Custom',
];

const TONE_OPTIONS = [
  'Cinematic',
  'Playful',
  'Epic',
  'Noir',
  'Satirical',
  'Hopeful',
  'Dark',
  'Wonder-filled',
  'Custom',
];

const STEPS: GuidedComicStep[] = [
  {
    id: 'setup',
    label: 'Setup',
    eyebrow: 'Start here',
    title: 'Choose the shape of the comic',
    summary: 'Set the format, tone, audience, and working title before any panels are created.',
    helperText: 'This step turns a loose idea into the basic project brief ARCS can carry through the rest of the flow.',
    actionLabel: 'Build Story Foundation',
    workflowCards: [
      {
        title: 'Project Brief',
        body: 'Working title, series or one-shot choice, issue number, audience, tone, and genre.',
      },
      {
        title: 'Comic Format',
        body: 'Choose webtoon or page spread, page size, target length, cover needs, and reading direction.',
      },
      {
        title: 'Foundation Output',
        body: 'A concise creative brief that can seed Writers Workshop, visual prep, and layout planning.',
      },
    ],
    Icon: Rocket,
  },
  {
    id: 'story',
    label: 'Story',
    eyebrow: 'Script foundation',
    title: 'Bring in the story spine',
    summary: 'Capture the synopsis, outline, page beats, or script context that will guide the rest of the workflow.',
    helperText: 'This step is where the comic’s narrative source of truth comes together before page planning.',
    actionLabel: 'Generate Issue Outline',
    workflowCards: [
      {
        title: 'Synopsis Source',
        body: 'Draft a synopsis here or prepare to pull issue context from Writers Workshop.',
      },
      {
        title: 'Outline Shape',
        body: 'Review act beats, page targets, key reveals, emotional turns, and dialogue needs.',
      },
      {
        title: 'Story Output',
        body: 'A usable issue outline that can feed page beats and later guide panel composition.',
      },
    ],
    Icon: BookOpenText,
  },
  {
    id: 'pages',
    label: 'Pages',
    eyebrow: 'Structure',
    title: 'Plan pages and panel density',
    summary: 'Decide how many pages are needed and where big moments deserve more space.',
    helperText: 'This step maps story beats into pages so the comic has pacing before artwork begins.',
    actionLabel: 'Generate Page Plan',
    workflowCards: [
      {
        title: 'Page Targets',
        body: 'Define page count, cover pages, double-page spread moments, and recap or end-card needs.',
      },
      {
        title: 'Panel Density',
        body: 'Mark quiet pages, action pages, hero panels, splash moments, and dialogue-heavy pages.',
      },
      {
        title: 'Page Output',
        body: 'A page-by-page plan ready for Writers Workshop page beats or manual layout drafting.',
      },
    ],
    Icon: PanelTop,
  },
  {
    id: 'visual-prep',
    label: 'Visual Prep',
    eyebrow: 'Reference pass',
    title: 'Gather characters, locations, and props',
    summary: 'Review what should come from the Image Vault and what still needs reference art.',
    helperText: 'This step lines up the Image Vault, Character Studio, Asset Studio, and Imageshop before panel art.',
    actionLabel: 'Prepare References',
    workflowCards: [
      {
        title: 'Vault Matches',
        body: 'Identify existing character profiles, asset collections, NPC refs, and supporting images.',
      },
      {
        title: 'Missing References',
        body: 'List recurring cast, locations, props, costumes, and mood refs that still need creation.',
      },
      {
        title: 'Prep Output',
        body: 'A visual prep queue for Illustrator’s Imageshop, Character Studio, and Asset Studio.',
      },
    ],
    Icon: ImagePlus,
  },
  {
    id: 'art',
    label: 'Art',
    eyebrow: 'Image creation',
    title: 'Create or select panel artwork',
    summary: 'Move from prepared references into art selection for the pages that need images.',
    helperText: 'This step is the artwork pass: pick finished images, note gaps, and prepare panel assignments.',
    actionLabel: 'Generate Panel Art',
    workflowCards: [
      {
        title: 'Art Queue',
        body: 'Track panels needing new art, panels using vault images, and panels that only need placeholders.',
      },
      {
        title: 'Style Continuity',
        body: 'Carry character consistency, setting continuity, aspect ratio, camera notes, and lighting notes.',
      },
      {
        title: 'Art Output',
        body: 'Panel-ready image selections that can be placed into the advanced Comics Studio canvas.',
      },
    ],
    Icon: Palette,
  },
  {
    id: 'layout',
    label: 'Layout',
    eyebrow: 'Comic assembly',
    title: 'Arrange panels, balloons, and pacing',
    summary: 'Use the guided plan to enter layout work, then refine in the advanced comic editor when needed.',
    helperText: 'This step turns planned pages and prepared art into a layout checklist before precision editing.',
    actionLabel: 'Arrange Comic Pages',
    workflowCards: [
      {
        title: 'Layout Draft',
        body: 'Choose page templates, panel order, gutter rhythm, splash panels, and spread composition.',
      },
      {
        title: 'Lettering Pass',
        body: 'Plan speech balloons, captions, sound effects, reading order, and dialogue balance.',
      },
      {
        title: 'Layout Output',
        body: 'A page assembly plan for the existing advanced editor with panels, balloons, and assets in mind.',
      },
    ],
    Icon: LayoutTemplate,
  },
  {
    id: 'export',
    label: 'Export',
    eyebrow: 'Finish',
    title: 'Review and publish the issue',
    summary: 'Check pages, confirm export format, and prepare the comic for download or sharing.',
    helperText: 'This step helps catch missing images, rough lettering, and format choices before final export.',
    actionLabel: 'Export Comic',
    workflowCards: [
      {
        title: 'Readthrough',
        body: 'Review page order, story clarity, missing panels, unfinished balloons, and visual consistency.',
      },
      {
        title: 'Export Choice',
        body: 'Prepare PNG or PDF output, page naming, dimensions, and final quality checks.',
      },
      {
        title: 'Export Output',
        body: 'A final readiness checklist before using the advanced studio export tools.',
      },
    ],
    Icon: Download,
  },
];

interface GuidedComicFlowProps {
  onOpenAdvancedStudio: () => void;
}

export function GuidedComicFlow({ onOpenAdvancedStudio }: GuidedComicFlowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [setupForm, setSetupForm] = useState<SetupFormState>({
    seriesTitle: '',
    issueTitle: '',
    issueNumber: '1',
    targetPageCount: '22',
    genre: GENRE_OPTIONS[0],
    tone: TONE_OPTIONS[0],
    premise: '',
  });
  const activeStep = STEPS[activeIndex];
  const progress = useMemo(() => ((activeIndex + 1) / STEPS.length) * 100, [activeIndex]);
  const atStart = activeIndex === 0;
  const atEnd = activeIndex === STEPS.length - 1;
  const isSetupStep = activeStep.id === 'setup';

  const goBack = () => setActiveIndex((index) => Math.max(0, index - 1));
  const goNext = () => setActiveIndex((index) => Math.min(STEPS.length - 1, index + 1));
  const updateSetupField = (field: keyof SetupFormState, value: string) => {
    setSetupForm((current) => ({ ...current, [field]: value }));
  };

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
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10 active:scale-[0.99]"
                style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(255,255,255,0.08)' }}
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
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                  {activeStep.helperText}
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90">{activeStep.actionLabel}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">
                    {isSetupStep
                      ? 'Complete the local brief, then continue into Story. Nothing is saved or sent yet.'
                      : 'This button is a planning placeholder for now; no AI calls or data changes happen in this pass.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isSetupStep}
                  onClick={isSetupStep ? goNext : undefined}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                >
                  {activeStep.actionLabel}
                </button>
              </div>

              {isSetupStep ? (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Comic / series title
                      <input
                        type="text"
                        value={setupForm.seriesTitle}
                        onChange={(event) => updateSetupField('seriesTitle', event.target.value)}
                        placeholder="e.g. The Astral City"
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Issue title
                      <input
                        type="text"
                        value={setupForm.issueTitle}
                        onChange={(event) => updateSetupField('issueTitle', event.target.value)}
                        placeholder="e.g. Gate of the First Sun"
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Issue number
                      <input
                        type="number"
                        min="1"
                        value={setupForm.issueNumber}
                        onChange={(event) => updateSetupField('issueNumber', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Target page count
                      <input
                        type="number"
                        min="1"
                        value={setupForm.targetPageCount}
                        onChange={(event) => updateSetupField('targetPageCount', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Genre
                      <select
                        value={setupForm.genre}
                        onChange={(event) => updateSetupField('genre', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      >
                        {GENRE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Tone
                      <select
                        value={setupForm.tone}
                        onChange={(event) => updateSetupField('tone', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      >
                        {TONE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                    Short idea / premise
                    <textarea
                      value={setupForm.premise}
                      onChange={(event) => updateSetupField('premise', event.target.value)}
                      rows={5}
                      placeholder="Describe the central conflict, main character, setting, or the image you want the comic to leave in the reader’s mind."
                      className="min-h-[8rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Local only</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">
                        Values stay in this guided flow while you move between steps.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Story seed</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">
                        The next pass can use this brief to shape outline and page planning tools.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">No write yet</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">
                        This does not call AI, Supabase, or localStorage.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {activeStep.workflowCards.map((card) => (
                    <div key={card.title} className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{card.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">{card.body}</p>
                    </div>
                  ))}
                </div>
              )}
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
              What happens next
            </p>
            <h3 className="mt-2 text-lg font-black text-white">
              {isSetupStep ? 'Your brief becomes the story starting point' : `${activeStep.label} leads into the next pass`}
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/65">
              {isSetupStep ? (
                <>
                  <li>Use the title, issue details, genre, tone, and premise to frame the Story step.</li>
                  <li>Move forward to outline planning without saving anything outside this screen.</li>
                  <li>Return here anytime during this session to adjust the foundation.</li>
                </>
              ) : (
                <>
                  <li>Review the guidance cards for this stage.</li>
                  <li>Use Back or Next to move through the comic workflow.</li>
                  <li>Open the advanced studio whenever you are ready for canvas work.</li>
                </>
              )}
            </ul>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold text-white/85">Ready for precision work?</p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                Open the full studio when you are ready to work directly on the canvas.
              </p>
              <button
                type="button"
                onClick={onOpenAdvancedStudio}
                className="mt-4 w-full rounded-lg border px-3 py-2 text-xs font-bold text-white/85 transition hover:bg-white/10"
                style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(255,255,255,0.08)' }}
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
