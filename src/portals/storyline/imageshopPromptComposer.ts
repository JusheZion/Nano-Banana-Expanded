import type { GuidedImageWorkshopReference } from '@/stores/imageWorkshopBridge';

export type ImageshopGenerationMode = 'video-beats' | 'comic-pages';

export type ImageshopPromptSectionKey =
  | 'main'
  | 'negative'
  | 'character'
  | 'environment'
  | 'artStyle'
  | 'camera'
  | 'continuity';

export type ImageshopPromptWorkspace = Record<ImageshopPromptSectionKey, string>;

export type ImageshopArtStyle = {
  id: string;
  name: string;
  description: string;
  prompt: string;
};

export type ImageshopContinuitySettings = {
  lockFaces: boolean;
  lockHairstyles: boolean;
  lockCostumes: boolean;
  lockProps: boolean;
  lockEnvironment: boolean;
  characterBibleMode: boolean;
  strength: number;
};

export type ImageshopPageType =
  | 'single-comic-page'
  | 'standard-comic-page'
  | 'double-page-spread'
  | 'splash-page'
  | 'cover'
  | 'character-sheet'
  | 'environment-sheet'
  | 'asset-sheet';

export type ImageshopBorderStyle =
  | 'standard'
  | 'thin'
  | 'thick'
  | 'rounded'
  | 'manga'
  | 'frameless'
  | 'custom';

export type ImageshopPanelStyle = {
  borderStyle: ImageshopBorderStyle;
  borderColor: string;
  gutterColor: string;
  gutterWidth: number;
  pageBackgroundUrl: string;
};

export type ImageshopPageConfig = {
  pageType: ImageshopPageType;
  includePanelNumbers: boolean;
  includeDialogue: boolean;
  includeCaptions: boolean;
  includeSfx: boolean;
  includePageNumbers: boolean;
  layoutTemplateId: string;
  panelStyle: ImageshopPanelStyle;
};

export const BUILT_IN_IMAGESHOP_ART_STYLES: ImageshopArtStyle[] = [
  {
    id: 'teslan-cgi',
    name: 'Teslan CGI',
    description: 'Stylized CGI with polished materials and cinematic warmth.',
    prompt: 'Teslan CGI, crisp stylized rendering, polished surfaces, cinematic warmth.',
  },
  {
    id: 'disonian-fantasy',
    name: 'Disonian Fantasy',
    description: 'Fantasy illustration with ornate silhouettes and atmospheric color.',
    prompt: 'Disonian fantasy illustration, ornate silhouettes, luminous atmosphere, elegant detail.',
  },
  {
    id: 'ido-classroom-style',
    name: 'IDO Classroom Style',
    description: 'Bright educational concept-art style with readable expressions.',
    prompt: 'IDO classroom style, bright educational illustration, clean readable expressions, clear staging.',
  },
  {
    id: 'amares-style',
    name: 'Amares Style',
    description: 'Soft celestial fantasy with graceful shapes and glow.',
    prompt: 'Amares fantasy style, soft celestial glow, graceful shapes, ornate details.',
  },
];

const PAGE_TYPE_LABELS: Record<ImageshopPageType, string> = {
  'single-comic-page': 'Single Comic Page',
  'standard-comic-page': 'Standard Comic Page',
  'double-page-spread': 'Double Page Spread',
  'splash-page': 'Splash Page',
  cover: 'Cover',
  'character-sheet': 'Character Sheet',
  'environment-sheet': 'Environment Sheet',
  'asset-sheet': 'Asset Sheet',
};

export function createDefaultImageshopPromptWorkspace(): ImageshopPromptWorkspace {
  return {
    main: '',
    negative: '',
    character: '',
    environment: '',
    artStyle: '',
    camera: '',
    continuity: '',
  };
}

export function createDefaultImageshopContinuitySettings(): ImageshopContinuitySettings {
  return {
    lockFaces: false,
    lockHairstyles: false,
    lockCostumes: false,
    lockProps: false,
    lockEnvironment: false,
    characterBibleMode: false,
    strength: 65,
  };
}

export function createDefaultImageshopPageConfig(): ImageshopPageConfig {
  return {
    pageType: 'single-comic-page',
    includePanelNumbers: false,
    includeDialogue: false,
    includeCaptions: false,
    includeSfx: false,
    includePageNumbers: false,
    layoutTemplateId: 'auto',
    panelStyle: {
      borderStyle: 'standard',
      borderColor: '#111111',
      gutterColor: '#ffffff',
      gutterWidth: 12,
      pageBackgroundUrl: '',
    },
  };
}

function formatMode(mode: ImageshopGenerationMode): string {
  return mode === 'comic-pages' ? 'Comic Pages' : 'Video Beats';
}

function addLine(lines: string[], label: string, value: string | null | undefined): void {
  const text = value?.trim();
  if (text) lines.push(`${label}: ${text}`);
}

function formatReference(reference: GuidedImageWorkshopReference): string {
  return [
    reference.displayName,
    reference.sourceType ? `type ${reference.sourceType}` : '',
    reference.profileName ? `profile ${reference.profileName}` : '',
    reference.castName ? `cast ${reference.castName}` : '',
    reference.imageLabel ? `image ${reference.imageLabel}` : '',
    reference.sourceLabel ? `source ${reference.sourceLabel}` : '',
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' | ');
}

function formatPanelOptions(config: ImageshopPageConfig): string {
  const options = [
    config.includePanelNumbers ? 'panel numbers' : '',
    config.includeDialogue ? 'dialogue' : '',
    config.includeCaptions ? 'captions' : '',
    config.includeSfx ? 'SFX' : '',
    config.includePageNumbers ? 'page numbers' : '',
  ].filter(Boolean);
  return options.length > 0 ? options.join(', ') : 'none';
}

function formatContinuityLocks(continuity: ImageshopContinuitySettings): string {
  return [
    continuity.lockFaces ? 'faces' : '',
    continuity.lockHairstyles ? 'hairstyles' : '',
    continuity.lockCostumes ? 'costumes' : '',
    continuity.lockProps ? 'props' : '',
    continuity.lockEnvironment ? 'environment' : '',
  ]
    .filter(Boolean)
    .join(', ');
}

export function composeImageshopPrompt({
  mode,
  workspace,
  artStyle,
  continuity,
  references,
  pageConfig,
}: {
  mode: ImageshopGenerationMode;
  workspace: ImageshopPromptWorkspace;
  artStyle: ImageshopArtStyle | null;
  continuity: ImageshopContinuitySettings;
  references: GuidedImageWorkshopReference[];
  pageConfig: ImageshopPageConfig;
}): string {
  const lines: string[] = [`Generation mode: ${formatMode(mode)}`];

  addLine(lines, 'Main prompt', workspace.main);
  addLine(lines, 'Avoid list', workspace.negative);
  addLine(lines, 'Character instructions', workspace.character);
  addLine(lines, 'Environment instructions', workspace.environment);
  addLine(lines, 'Art style instructions', workspace.artStyle);
  addLine(lines, 'Camera instructions', workspace.camera);
  addLine(lines, 'Continuity instructions', workspace.continuity);

  if (artStyle) {
    lines.push(`Art style: ${artStyle.name}`);
    addLine(lines, 'Art style definition', artStyle.prompt);
  }

  if (mode === 'comic-pages') {
    lines.push(`Page type: ${PAGE_TYPE_LABELS[pageConfig.pageType]}`);
    lines.push(`Layout template: ${pageConfig.layoutTemplateId}`);
    lines.push(`Panel options: ${formatPanelOptions(pageConfig)}`);
    lines.push(
      `Panel style: ${pageConfig.panelStyle.borderStyle} border, border ${pageConfig.panelStyle.borderColor}, gutter ${pageConfig.panelStyle.gutterColor}, gutter width ${pageConfig.panelStyle.gutterWidth}px`,
    );
    addLine(lines, 'Page background image', pageConfig.panelStyle.pageBackgroundUrl);
  }

  lines.push(`Continuity strength: ${Math.max(0, Math.min(100, continuity.strength))}/100`);
  if (continuity.characterBibleMode) {
    lines.push('Character Bible Mode: Use selected references as authoritative source; prevent character drift.');
  }

  const locks = formatContinuityLocks(continuity);
  if (locks) lines.push(`Locked continuity: ${locks}`);

  const formattedReferences = references.map(formatReference).filter(Boolean);
  if (formattedReferences.length > 0) {
    lines.push(`Selected references: ${formattedReferences.join('; ')}`);
    lines.push(
      'Reference injection: Use appearance data, costume data, color information, continuity rules, and art-style cues from the selected references.',
    );
  }

  return lines.join('\n');
}
