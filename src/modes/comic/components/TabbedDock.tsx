import { LayoutGrid, Layers, Settings, Library } from 'lucide-react';

// The dock is rendered inline by ComicLayout; only these shared bits are consumed.
// (The former standalone <TabbedDock> component was dead code and has been removed.)
export type TabbedDockTabId = 'pages' | 'layers' | 'settings' | 'assets';

export const PagesTabIcon = () => <LayoutGrid size={16} />;
export const LayersTabIcon = () => <Layers size={16} />;
export const SettingsTabIcon = () => <Settings size={16} />;
export const AssetsTabIcon = () => <Library size={16} />;
