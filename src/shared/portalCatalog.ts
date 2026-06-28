import type { LucideIcon } from 'lucide-react';
import {
  BookMarked,
  Building2,
  Image as ImageIcon,
  Library,
  MessageCircle,
  PenLine,
  ScrollText,
  Sparkles,
  User,
} from 'lucide-react';
import type { Portal } from '@/shared/portals';
import type { Theme } from '@/shared/context/ThemeContext';

/** Gold glitter fill for nav + card icon wells (stakeholder intake). */
export const PORTAL_ICON_GLITTER =
  'linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)';

export const HUB_HOME_LABEL = 'ARC Hub';

export type CreativePortal = Exclude<Portal, 'home'>;

export type PortalCatalogEntry = {
  portal: CreativePortal;
  theme: Theme;
  navLabel: string;
  cardTitle: string;
  cardSubtitle: string;
  /** Card + nav outline / emphasis */
  accentHex: string;
  Icon: LucideIcon;
  /** Optional photographic card background */
  cardImageUrl?: string;
};

/**
 * Order matches stakeholder intake: Writers' → Character → Assets → Vault → Storyline → Comic → Wiki.
 */
export const CREATIVE_PORTALS_ORDERED: PortalCatalogEntry[] = [
  {
    portal: 'writer',
    theme: 'teal',
    navLabel: "Writers' Workshop",
    cardTitle: "Writers' Workshop",
    cardSubtitle: 'AI Assistance from Arcs and Outlines to Beats and Dialogue',
    accentHex: '#81D8D0',
    Icon: PenLine,
    cardImageUrl: '/assets/images/City%20of%20Capricorn.jpg',
  },
  {
    portal: 'studio',
    theme: 'teal',
    navLabel: 'Character Studio',
    cardTitle: 'Character Studio',
    cardSubtitle: 'Create Consistent Characters with Prompt Assistance',
    accentHex: '#10b981',
    Icon: User,
    cardImageUrl: '/assets/images/City%20of%20Aquarius.jpg',
  },
  {
    portal: 'assets',
    theme: 'purple',
    navLabel: 'Asset Studio',
    cardTitle: 'Asset Studio',
    cardSubtitle: 'Generate Settings & Props for Stories',
    accentHex: '#a855f7',
    Icon: Building2,
    cardImageUrl: '/assets/images/Anunnaki%20Sphinx.png',
  },
  {
    portal: 'reference',
    theme: 'purple',
    navLabel: 'Reference Vault',
    cardTitle: 'Image Vault',
    cardSubtitle: 'View and Organize your Images',
    accentHex: '#e11d48',
    Icon: ImageIcon,
    cardImageUrl: '/assets/images/Aries%20Palace.jpg',
  },
  {
    portal: 'prompts',
    theme: 'gold',
    navLabel: 'Prompt Library',
    cardTitle: 'Prompt Library',
    cardSubtitle: 'Curate prompts, versions, provenance, and cross-portal handoffs',
    accentHex: '#d4af37',
    Icon: Library,
    cardImageUrl: '/assets/images/Aquarius%20Sphere.jpg',
  },
  {
    portal: 'lab',
    theme: 'gold',
    navLabel: "Illustrator’s Imageshop",
    cardTitle: "Illustrator’s Imageshop",
    cardSubtitle: 'Turn writer context into matched refs, quick refs, and studio-ready visuals',
    accentHex: '#991b1b',
    Icon: ScrollText,
    cardImageUrl: '/assets/images/Aquarius%20Sphere.jpg',
  },
  {
    portal: 'comic',
    theme: 'obsidian',
    navLabel: 'Comic Creator',
    cardTitle: 'Comic Creator',
    cardSubtitle: 'Guided Comics: Issue Lightbox, Page Production, and cinematic Panel Focus',
    accentHex: '#2563eb',
    Icon: MessageCircle,
    cardImageUrl: '/assets/images/Aries%20In%20the%20Observatory.jpeg',
  },
  {
    portal: 'wiki',
    theme: 'wiki',
    navLabel: 'Wiki ARC Portal',
    cardTitle: 'ARCS Wiki Portal',
    cardSubtitle: 'Guided Tutorials on all App Tools & Features',
    accentHex: '#d946a3',
    Icon: BookMarked,
  },
  {
    portal: 'lore',
    theme: 'obsidian',
    navLabel: 'Lore Dossier',
    cardTitle: 'Kitana Lore Dossier',
    cardSubtitle: 'Premium Mortal Kombat royal archive: stats, lineage, powers, timeline, and finishers',
    accentHex: '#1d78c8',
    Icon: Sparkles,
    cardImageUrl: 'https://www.mortalkombatwarehouse.com/mk12/renders/ekk/K1_KitanaRenders_Action-pose.png',
  },
];

const accentByPortal: Partial<Record<Portal, string>> = Object.fromEntries(
  CREATIVE_PORTALS_ORDERED.map((e) => [e.portal, e.accentHex]),
) as Partial<Record<Portal, string>>;

export function accentForPortal(p: Portal): string {
  if (p === 'home') return '#D4AF37';
  return accentByPortal[p] ?? '#D4AF37';
}

export function catalogEntryForPortal(portal: CreativePortal): PortalCatalogEntry | undefined {
  return CREATIVE_PORTALS_ORDERED.find((e) => e.portal === portal);
}

export function getPortalIcon(portal: CreativePortal): LucideIcon {
  const e = catalogEntryForPortal(portal);
  if (!e) throw new Error(`Unknown creative portal: ${portal}`);
  return e.Icon;
}
