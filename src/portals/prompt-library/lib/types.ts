export type PromptCategory =
  | "character"
  | "look"
  | "scene"
  | "style"
  | "system"
  | "project"
  | "misc";

export type PromptSourcePortal =
  | "manual"
  | "writer"
  | "lab"
  | "comic"
  | "studio"
  | "assets"
  | "reference"
  | "wiki";

export interface LinkedEntity {
  id: string;
  name: string;
  description?: string;
}

export interface PromptVariable {
  id: string;
  name: string;
  defaultValue: string;
  isRequired: boolean;
}

export interface PromptVersion {
  id: string;
  versionNumber: number;
  promptText: string;
  notes: string;
  createdAt: string;
}

export interface PromptRecord {
  id: string;
  title: string;
  promptText: string;
  category: PromptCategory;
  notes: string;
  model: string;
  status: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  collections: string[];
  characters: LinkedEntity[];
  looks: LinkedEntity[];
  scenes: LinkedEntity[];
  variables: PromptVariable[];
  versions: PromptVersion[];
  sourcePortal?: PromptSourcePortal | "";
  sourceLabel?: string;
  sourceContext?: Record<string, unknown>;
  promptSections?: Record<string, unknown>;
}

export interface PromptDraft {
  id?: string;
  title: string;
  promptText: string;
  category: PromptCategory;
  notes: string;
  model: string;
  status: string;
  isFavorite: boolean;
  tags: string;
  collections: string;
  characters: string;
  looks: string;
  scenes: string;
  variables: string;
  sourcePortal?: PromptSourcePortal | "";
  sourceLabel?: string;
  sourceContext?: Record<string, unknown>;
  promptSections?: Record<string, unknown>;
}

export interface LibraryFilters {
  search: string;
  category: "all" | PromptCategory;
  tag: string;
  model: string;
  entity: string;
  favoritesOnly: boolean;
}

export interface CategoryMeta {
  label: string;
  accent: string;
  soft: string;
}

export interface LibrarySnapshot {
  exportedAt: string;
  prompts: PromptRecord[];
}
