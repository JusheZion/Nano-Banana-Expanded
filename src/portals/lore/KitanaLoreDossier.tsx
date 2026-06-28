import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

type RenderId = 'dossier' | 'hero' | 'action' | 'dark-solstice';
type TemplateId = 'royal' | 'sapphire' | 'archive';

const mkBase = 'https://www.mortalkombatwarehouse.com';
const kitanaAsset = (path: string) => `${mkBase}/mk12/characters/kitana/${path}`;
const gearAsset = (path: string) => `${mkBase}/mk12/gear/${path}`;

const renders: Array<{
  id: RenderId;
  label: string;
  caption: string;
  url: string;
}> = [
  {
    id: 'dossier',
    label: 'Dossier Fan',
    caption: 'MK1 official Kitana fan render',
    url: `${mkBase}/mk12/renders/kitana.png`,
  },
  {
    id: 'action',
    label: 'Hero Fan',
    caption: 'MK1 dual fan action pose',
    url: `${mkBase}/mk12/renders/ekk/K1_KitanaRenders_Action-pose.png`,
  },
  {
    id: 'hero',
    label: 'Royal Pose',
    caption: 'MK1 promotional hero pose',
    url: `${mkBase}/mk12/renders/ekk/K1_KitanaRenders_Hero-pose.png`,
  },
  {
    id: 'dark-solstice',
    label: 'Dark Solstice',
    caption: 'MK1 premium skin render',
    url: `${mkBase}/mk12/renders/ekk/K1_Kitana-DarkSolsticeRender.png`,
  },
];

const templates: Array<{ id: TemplateId; label: string; note: string }> = [
  { id: 'royal', label: 'Royal dossier', note: 'Black, antique gold, sapphire hero plate' },
  { id: 'sapphire', label: 'Sapphire intel', note: 'Cooler blue combat archive variant' },
  { id: 'archive', label: 'Edenian archive', note: 'Warmer parchment-gold collectible plate' },
];

const topTraits = [
  ['Role', 'Protector'],
  ['Lineage', 'Royal court'],
  ['Difficulty', 'Medium-Hard'],
  ['Theme', 'Royal wind assassin'],
] as const;

const abilityRows = [
  {
    type: 'Core',
    title: 'Duty to the throne',
    image: kitanaAsset('UIPortraits/Kitana-Square.png'),
    text: 'Kitana aids and protects Mileena as the older twin prepares to rule Outworld.',
    bullets: ['Rejects calls to replace Mileena', 'Protects the royal secret'],
  },
  {
    type: 'Weapon',
    title: 'Steel fan pressure',
    image: gearAsset('Kitana_Gear001_A.png'),
    text: 'Bladed fan work controls space, punishes approach, and frames her as a precise royal duelist.',
    bullets: ['Razor edge zoning', 'Fast mid-range checks'],
  },
  {
    type: 'Move',
    title: 'Wind lift',
    image: kitanaAsset('UIBrutalities/Kitana_Brutality_3.png'),
    text: 'Wind and fan techniques lift opponents into the path of follow-up strikes.',
    bullets: ['Air control', 'Vortex pressure'],
  },
  {
    type: 'Style',
    title: 'Edenian command',
    image: kitanaAsset('UITaunts/Kitana_Taunt4_Static.png'),
    text: 'Court training gives Kitana discipline, patience, and tactical authority under pressure.',
    bullets: ['Composed defense', 'Royal bearing'],
  },
  {
    type: 'Finisher',
    title: 'Royal Blender',
    image: kitanaAsset('UIFatalities/Kitana_A.png'),
    text: 'The dossier uses official finisher art only where the source page exposes a truthful Kitana card.',
    bullets: ['Fatality 1', 'Official MK1 card'],
  },
] as const;

const combatShowcase = [
  ['Fatality', 'Royal Blender', 'Far', kitanaAsset('UIFatalities/Kitana_A.png')],
  ['Fatality', 'Last Kiss', 'Close', kitanaAsset('UIFatalities/Kitana_B.png')],
  ['Animality', 'Royal Nectar', 'Mid', kitanaAsset('DeepDish_Kitana_Square.png')],
] as const;

const equipment = [
  ['Royal fan', 'Primary gear', gearAsset('Kitana_Gear001_A.png')],
  ['Ceremonial fan', 'Alternate gear', gearAsset('Kitana_Gear002_A.png')],
  ['Battle fan', 'Alternate gear', gearAsset('Kitana_Gear003_A.png')],
] as const;

const lineage = [
  {
    name: 'Sindel',
    role: 'Mother / Empress',
    detail: 'Welcomed twin daughters Mileena and Kitana in the New Era.',
    image: `${mkBase}/mk12/characters/sindel/UIPortraits/Sindel-Square.png`,
  },
  {
    name: 'Mileena',
    role: 'Older twin / Heir',
    detail: 'Firstborn heir to Outworld; Kitana protects her claim.',
    image: `${mkBase}/mk12/characters/mileena/UIPortraits/Mileena-Square.png`,
  },
  {
    name: 'Jade',
    role: 'Countess / Ally',
    detail: 'Edenian noble and Kitana’s longtime ally; included here instead of an unverified royal portrait.',
    image: `${mkBase}/mk11/renders/jade.png`,
  },
  {
    name: 'Kitana',
    role: 'Princess / Defender',
    detail: 'Princess and commander who fights to make Mileena the best Empress possible.',
    image: kitanaAsset('UIPortraits/Kitana-Square.png'),
  },
] as const;

const strengths = [
  { label: 'Fan zoning', detail: 'Controls mid-range approaches.', motif: 'fan' },
  { label: 'Air control', detail: 'Lifts and repositions enemies.', motif: 'wind' },
  { label: 'Composure', detail: 'Court discipline under pressure.', motif: 'gem' },
  { label: 'Loyalty', detail: 'Protects Mileena and Outworld.', motif: 'crown' },
] as const;

const stats = [
  ['Attack', 8.8],
  ['Defense', 7.8],
  ['Agility', 9.5],
  ['Special', 9.2],
  ['Control', 8.6],
] as const;

const timeline = [
  { era: 'MK II', mark: 'II', detail: 'Edenian truth revealed' },
  { era: 'MK3', mark: '3', detail: 'Edenia defended' },
  { era: 'MK9', mark: '9', detail: 'Shao Kahn rejected' },
  { era: 'MK11', mark: '11', detail: 'Kitana Kahn rises' },
  { era: 'MK1', mark: '1', detail: 'Mileena protected' },
  { era: 'MK1 End', mark: '1+', detail: 'Outworld forces commanded' },
] as const;

const sources = [
  ['MKWarehouse Kitana data', 'https://www.mortalkombatwarehouse.com/mk12/characters/kitana/'],
  ['MKWarehouse Sindel data', 'https://www.mortalkombatwarehouse.com/mk12/characters/sindel/'],
  ['MKWarehouse Jade render', 'https://www.mortalkombatwarehouse.com/mk11/renders/jade.png'],
  ['MKWarehouse MK1 finishers', 'https://www.mortalkombatwarehouse.com/mk12/fatalities/'],
  ['Kitana overview', 'https://en.wikipedia.org/wiki/Kitana'],
] as const;

export function KitanaLoreDossier() {
  const dossierRef = useRef<HTMLElement>(null);
  const [activeRenderId, setActiveRenderId] = useState<RenderId>('dossier');
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('royal');
  const [failedRenderIds, setFailedRenderIds] = useState<RenderId[]>([]);

  const activeRender = useMemo(
    () => renders.find((render) => render.id === activeRenderId) ?? renders[0],
    [activeRenderId],
  );
  const activeRenderFailed = failedRenderIds.includes(activeRender.id);
  const radarPoints = useMemo(() => {
    const center = 50;
    const radius = 38;
    return stats
      .map(([, value], index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / stats.length;
        const scaledRadius = (value / 10) * radius;
        const x = center + Math.cos(angle) * scaledRadius;
        const y = center + Math.sin(angle) * scaledRadius;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      dossierRef.current?.scrollIntoView({ block: 'start' });
    });
  }, []);

  return (
    <section ref={dossierRef} className="kitana-template-studio">
      <div className="kitana-template-toolbar" aria-label="Dossier template controls">
        <div>
          <p className="kitana-toolbar-kicker">Template mode</p>
          <h1>Premium character dossier generator</h1>
        </div>
        <div className="kitana-template-actions">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setActiveTemplate(template.id)}
              aria-pressed={activeTemplate === template.id}
              title={template.note}
            >
              {template.label}
            </button>
          ))}
        </div>
        <div className="kitana-template-actions" aria-label="Official render choices">
          {renders.map((render) => (
            <button
              key={render.id}
              type="button"
              onClick={() => setActiveRenderId(render.id)}
              aria-pressed={activeRenderId === render.id}
              title={render.caption}
            >
              {render.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`mk-dossier-plate mk-dossier-plate--${activeTemplate} mk-dossier-v2`}>
        <OrnateCorners />
        <img className="mk-v2-scene" src={kitanaAsset('DeepDish_Kitana_Long.png')} alt="" aria-hidden referrerPolicy="no-referrer" />
        {!activeRenderFailed ? (
          <img className="mk-v2-ghost" src={activeRender.url} alt="" aria-hidden referrerPolicy="no-referrer" />
        ) : null}
        <div className="mk-v2-orbit mk-v2-orbit--one" aria-hidden />
        <div className="mk-v2-orbit mk-v2-orbit--two" aria-hidden />

        <header className="mk-v2-topbar">
          <span>Character dossier</span>
          <strong>Mortal Kombat</strong>
          <span>Outworld file / Edenian bloodline</span>
        </header>

        <section className="mk-v2-title">
          <h2>Kitana</h2>
          <p>Princess of Outworld. Edenian royal blood. Steel fan commander.</p>
        </section>

        <section className="mk-v2-render-stage" aria-label="Official Kitana render">
          <div className="mk-v2-sigil" aria-hidden />
          {activeRenderFailed ? (
            <div className="mk-render-fallback">Render source unavailable. Source links remain below.</div>
          ) : (
            <img
              className={`mk-v2-render mk-v2-render--${activeRender.id}`}
              src={activeRender.url}
              alt={`Kitana ${activeRender.caption}`}
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedRenderIds((current) =>
                  current.includes(activeRender.id) ? current : [...current, activeRender.id],
                )
              }
            />
          )}
        </section>

        <section className="mk-v2-traits" aria-label="Core dossier traits">
          {topTraits.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        <PanelFrame className="mk-v2-core" title="Core Concept">
          <div className="mk-v2-core-grid">
            <img src={kitanaAsset('UIPortraits/KitanaTitanKAM-Square.png')} alt="" aria-hidden referrerPolicy="no-referrer" />
            <p>
              Kitana&apos;s MK1 file is built around duty: she protects Mileena&apos;s claim, rejects pressure to
              replace her sister, and turns royal discipline into battlefield control.
            </p>
          </div>
        </PanelFrame>

        <section className="mk-v2-ability-stack" aria-label="Combat and dossier rows">
          {abilityRows.map((row) => (
            <article key={row.title} className="mk-v2-ability-row">
              <div className="mk-v2-row-type">{row.type}</div>
              <div className="mk-v2-row-copy">
                <h3>{row.title}</h3>
                <p>{row.text}</p>
                <ul>
                  {row.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
              <div className="mk-v2-row-image">
                <img src={row.image} alt="" aria-hidden referrerPolicy="no-referrer" />
              </div>
            </article>
          ))}
        </section>

        <PanelFrame className="mk-v2-strengths" title="Strengths">
          {strengths.map((strength) => (
            <MiniFinding key={strength.label} label={strength.label} detail={strength.detail} motif={strength.motif} />
          ))}
        </PanelFrame>

        <PanelFrame className="mk-v2-stats" title="Hero Attributes">
          <div className="mk-v2-radar-chart" aria-label="Character stat radial chart">
            <svg viewBox="0 0 100 100" role="img" aria-label="Attack 8.8, Defense 7.8, Agility 9.5, Special 9.2, Control 8.6">
              <polygon className="mk-v2-radar-grid mk-v2-radar-grid--outer" points="50,12 86,38 72,82 28,82 14,38" />
              <polygon className="mk-v2-radar-grid mk-v2-radar-grid--inner" points="50,27 72,43 64,69 36,69 28,43" />
              <line x1="50" y1="50" x2="50" y2="12" />
              <line x1="50" y1="50" x2="86" y2="38" />
              <line x1="50" y1="50" x2="72" y2="82" />
              <line x1="50" y1="50" x2="28" y2="82" />
              <line x1="50" y1="50" x2="14" y2="38" />
              <polygon className="mk-v2-radar-fill" points={radarPoints} />
            </svg>
            <div className="mk-v2-radar-labels" aria-hidden>
              {stats.map(([label, value]) => (
                <span key={label}>
                  <b>{label}</b>
                  <em>{value.toFixed(1)}</em>
                </span>
              ))}
            </div>
          </div>
        </PanelFrame>

        <PanelFrame className="mk-v2-lineage" title="Edenian Nobility">
          <div className="mk-v2-lineage-grid">
            {lineage.map((member) => (
              <article key={member.name}>
                <img src={member.image} alt="" aria-hidden referrerPolicy="no-referrer" />
                <div>
                  <h4>{member.name}</h4>
                  <p>{member.role}</p>
                  <small>{member.detail}</small>
                </div>
              </article>
            ))}
          </div>
        </PanelFrame>

        <PanelFrame className="mk-v2-equipment" title="Signature Equipment">
          <div className="mk-v2-gear-grid">
            {equipment.map(([name, detail, image]) => (
              <article key={name}>
                <img src={image} alt="" aria-hidden referrerPolicy="no-referrer" />
                <h4>{name}</h4>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </PanelFrame>

        <PanelFrame className="mk-v2-finishers" title="Finishers & Showcase">
          <div className="mk-v2-showcase-grid">
            {combatShowcase.map(([type, name, range, image]) => (
              <article key={name}>
                <img src={image} alt="" aria-hidden referrerPolicy="no-referrer" />
                <span>{type}</span>
                <h4>{name}</h4>
                <p>{range}</p>
              </article>
            ))}
          </div>
        </PanelFrame>

        <PanelFrame className="mk-v2-timeline" title="Timeline">
          <div className="mk-v2-timeline-track">
            {timeline.map(({ era, mark, detail }) => (
              <article key={era}>
                <b aria-label={era}>
                  <span>MK</span>
                  <em>{mark}</em>
                </b>
                <span>{detail}</span>
              </article>
            ))}
          </div>
        </PanelFrame>

        <footer className="mk-v2-footer">
          <strong>Duty is the blade. Loyalty is the shield.</strong>
        </footer>
      </div>

      <div className="kitana-source-strip">
        {sources.map(([label, href]) => (
          <a href={href} key={href} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />
            {label}
          </a>
        ))}
        <p>
          Official render references. Canon-safe lineage. No invented portraits. Mortal Kombat characters, names,
          renders, and trademarks belong to Warner Bros. and NetherRealm. Official renders are referenced externally,
          not copied into the repository.
        </p>
      </div>
    </section>
  );
}

function PanelFrame({ className, title, children }: { className: string; title: string; children: ReactNode }) {
  return (
    <section className={`mk-v2-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function MiniFinding({
  label,
  detail,
  motif,
}: {
  label: string;
  detail: string;
  motif: (typeof strengths)[number]['motif'];
}) {
  return (
    <article className="mk-v2-mini-finding">
      <span className={`mk-v2-effect-mark mk-v2-effect-mark--${motif}`} aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <div>
        <h4>{label}</h4>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function OrnateCorners() {
  return (
    <div className="mk-ornate-corners" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
