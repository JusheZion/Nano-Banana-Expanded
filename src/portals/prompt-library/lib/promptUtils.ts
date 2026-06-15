import type {
  CategoryMeta,
  LibraryFilters,
  PromptCategory,
  PromptDraft,
  PromptRecord,
  PromptVariable,
} from "./types";

export const categoryMeta: Record<PromptCategory, CategoryMeta> = {
  character: { label: "Character", accent: "#ff7a2f", soft: "rgba(255, 122, 47, 0.16)" },
  look: { label: "Look", accent: "#d69b32", soft: "rgba(214, 155, 50, 0.16)" },
  scene: { label: "Scene", accent: "#24b6c5", soft: "rgba(36, 182, 197, 0.16)" },
  style: { label: "Style", accent: "#f2b94c", soft: "rgba(242, 185, 76, 0.14)" },
  system: { label: "System", accent: "#d85a42", soft: "rgba(216, 90, 66, 0.15)" },
  project: { label: "Project", accent: "#6cbc68", soft: "rgba(108, 188, 104, 0.14)" },
  misc: { label: "Misc", accent: "#9b8f7b", soft: "rgba(155, 143, 123, 0.14)" },
};

export const emptyDraft: PromptDraft = {
  title: "",
  promptText: "",
  category: "scene",
  notes: "",
  model: "gpt-4o",
  status: "active",
  isFavorite: false,
  tags: "",
  collections: "",
  characters: "",
  looks: "",
  scenes: "",
  variables: "",
};

export function normalizeList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);
}

export function parseVariables(value: string): PromptVariable[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawDefault = "", rawRequired = ""] = line.split("|").map((part) => part.trim());
      const name = rawName.replace(/^\{|\}$/g, "");
      return {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || crypto.randomUUID(),
        name,
        defaultValue: rawDefault,
        isRequired: rawRequired.toLowerCase() === "required",
      };
    });
}

export function formatVariables(variables: PromptVariable[]): string {
  return variables
    .map((variable) =>
      [variable.name, variable.defaultValue, variable.isRequired ? "required" : ""].filter(Boolean).join(" | "),
    )
    .join("\n");
}

export function draftFromPrompt(prompt: PromptRecord): PromptDraft {
  return {
    id: prompt.id,
    title: prompt.title,
    promptText: prompt.promptText,
    category: prompt.category,
    notes: prompt.notes,
    model: prompt.model,
    status: prompt.status,
    isFavorite: prompt.isFavorite,
    tags: prompt.tags.join(", "),
    collections: prompt.collections.join(", "),
    characters: prompt.characters.map((item) => item.name).join(", "),
    looks: prompt.looks.map((item) => item.name).join(", "),
    scenes: prompt.scenes.map((item) => item.name).join(", "),
    variables: formatVariables(prompt.variables),
    sourcePortal: prompt.sourcePortal,
    sourceLabel: prompt.sourceLabel,
    sourceContext: prompt.sourceContext,
    promptSections: prompt.promptSections,
  };
}

export function createPromptFromDraft(draft: PromptDraft, previous?: PromptRecord): PromptRecord {
  const now = new Date().toISOString();
  const id = draft.id || previous?.id || crypto.randomUUID();
  const priorVersions = previous?.versions ?? [];
  const shouldAddVersion = previous && previous.promptText !== draft.promptText;
  const nextVersion = shouldAddVersion
    ? [
        {
          id: crypto.randomUUID(),
          versionNumber: priorVersions.length ? Math.max(...priorVersions.map((version) => version.versionNumber)) + 1 : 2,
          promptText: draft.promptText,
          notes: "Saved from editor.",
          createdAt: now,
        },
        ...priorVersions,
      ]
    : priorVersions;

  return {
    id,
    title: draft.title.trim() || "Untitled prompt",
    promptText: draft.promptText.trim(),
    category: draft.category,
    notes: draft.notes.trim(),
    model: draft.model.trim() || "gpt-4o",
    status: draft.status.trim() || "active",
    isFavorite: draft.isFavorite,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    tags: normalizeList(draft.tags),
    collections: normalizeList(draft.collections),
    characters: normalizeList(draft.characters).map((name) => ({ id: name.toLowerCase(), name })),
    looks: normalizeList(draft.looks).map((name) => ({ id: name.toLowerCase(), name })),
    scenes: normalizeList(draft.scenes).map((name) => ({ id: name.toLowerCase(), name })),
    variables: parseVariables(draft.variables),
    versions: nextVersion,
    sourcePortal: draft.sourcePortal ?? previous?.sourcePortal ?? "",
    sourceLabel: draft.sourceLabel?.trim() ?? previous?.sourceLabel ?? "",
    sourceContext: draft.sourceContext ?? previous?.sourceContext,
    promptSections: draft.promptSections ?? previous?.promptSections,
  };
}

export function duplicatePrompt(prompt: PromptRecord): PromptDraft {
  return {
    ...draftFromPrompt(prompt),
    id: undefined,
    title: `${prompt.title} copy`,
    isFavorite: false,
  };
}

export function combinePrompts(prompts: PromptRecord[]): PromptDraft {
  if (prompts.length < 2 || prompts.length > 3) {
    throw new Error("Combine prompts requires 2 to 3 source prompts.");
  }

  const sourceTitles = prompts.map((prompt) => prompt.title);
  const sharedCategory = prompts.every((prompt) => prompt.category === prompts[0].category) ? prompts[0].category : "project";
  const sharedModel = prompts.every((prompt) => prompt.model === prompts[0].model) ? prompts[0].model : prompts[0].model || "gpt-4o";
  const mergedVariables = mergeVariables(prompts.flatMap((prompt) => prompt.variables));
  const promptText = prompts
    .map((prompt, index) => [`## Source ${index + 1}: ${prompt.title}`, prompt.promptText.trim()].join("\n\n"))
    .join("\n\n---\n\n");

  return {
    title: buildCombinedTitle(sourceTitles),
    promptText,
    category: sharedCategory,
    notes: `Combined from ${prompts.length} Prompt Library records: ${sourceTitles.join(", ")}.`,
    model: sharedModel,
    status: "active",
    isFavorite: false,
    tags: joinUniqueText([...prompts.flatMap((prompt) => prompt.tags), "combined"]),
    collections: joinUniqueText(prompts.flatMap((prompt) => prompt.collections)),
    characters: joinUniqueText(prompts.flatMap((prompt) => prompt.characters.map((entity) => entity.name))),
    looks: joinUniqueText(prompts.flatMap((prompt) => prompt.looks.map((entity) => entity.name))),
    scenes: joinUniqueText(prompts.flatMap((prompt) => prompt.scenes.map((entity) => entity.name))),
    variables: formatVariables(mergedVariables),
    sourcePortal: "manual",
    sourceLabel: "Prompt Library combine",
    sourceContext: {
      combinedFrom: prompts.map((prompt, index) => ({
        order: index + 1,
        id: prompt.id,
        title: prompt.title,
        category: prompt.category,
        sourceLabel: prompt.sourceLabel || "",
      })),
    },
    promptSections: {
      combinedSources: prompts.map((prompt, index) => ({
        order: index + 1,
        id: prompt.id,
        title: prompt.title,
        promptText: prompt.promptText,
      })),
    },
  };
}

function buildCombinedTitle(titles: string[]) {
  if (titles.length === 2) return `Combined: ${titles[0]} + ${titles[1]}`;
  return `Combined: ${titles[0]} + ${titles[1]} + 1 more`;
}

function joinUniqueText(values: string[]) {
  return normalizeList(values.join(", ")).join(", ");
}

function mergeVariables(variables: PromptVariable[]): PromptVariable[] {
  const byName = new Map<string, PromptVariable>();
  variables.forEach((variable) => {
    const key = variable.name.toLowerCase();
    const existing = byName.get(key);
    byName.set(key, {
      ...variable,
      id: existing?.id ?? variable.id,
      defaultValue: existing?.defaultValue || variable.defaultValue,
      isRequired: Boolean(existing?.isRequired || variable.isRequired),
    });
  });
  return [...byName.values()];
}

export function matchesPrompt(prompt: PromptRecord, filters: LibraryFilters): boolean {
  if (filters.favoritesOnly && !prompt.isFavorite) return false;
  if (filters.category !== "all" && prompt.category !== filters.category) return false;
  if (filters.tag && !prompt.tags.some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()))) return false;
  if (filters.model && !prompt.model.toLowerCase().includes(filters.model.toLowerCase())) return false;

  const entityNames = [...prompt.characters, ...prompt.looks, ...prompt.scenes].map((entity) => entity.name.toLowerCase());
  if (filters.entity && !entityNames.some((entity) => entity.includes(filters.entity.toLowerCase()))) return false;

  const haystack = [
    prompt.title,
    prompt.promptText,
    prompt.category,
    prompt.notes,
    prompt.model,
    prompt.status,
    ...prompt.tags,
    ...prompt.collections,
    ...entityNames,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(filters.search.toLowerCase());
}

export function filterPrompts(prompts: PromptRecord[], filters: LibraryFilters): PromptRecord[] {
  return prompts
    .filter((prompt) => matchesPrompt(prompt, filters))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function createExport(prompts: PromptRecord[]) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), prompts }, null, 2);
}
