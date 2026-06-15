import { describe, expect, it } from "vitest";
import { demoPrompts } from "../data/demoData";
import {
  combinePrompts,
  createPromptFromDraft,
  duplicatePrompt,
  filterPrompts,
  formatVariables,
  normalizeList,
  parseVariables,
} from "./promptUtils";

describe("prompt utilities", () => {
  it("normalizes comma lists and removes case-insensitive duplicates", () => {
    expect(normalizeList("Kron, temple, kron,  ritual ")).toEqual(["Kron", "temple", "ritual"]);
  });

  it("parses prompt variables from editable lines", () => {
    expect(parseVariables("camera_angle | front wide | required\nlighting | dramatic")).toMatchObject([
      { name: "camera_angle", defaultValue: "front wide", isRequired: true },
      { name: "lighting", defaultValue: "dramatic", isRequired: false },
    ]);
  });

  it("formats prompt variables back to editable lines", () => {
    const variables = parseVariables("camera_angle | front wide | required\nlighting | dramatic");
    expect(formatVariables(variables)).toBe("camera_angle | front wide | required\nlighting | dramatic");
  });

  it("filters by search, category, tag, model, entity, and favorite state", () => {
    const result = filterPrompts(demoPrompts, {
      search: "temple",
      category: "scene",
      tag: "ritual",
      model: "gpt-4o",
      entity: "Kron",
      favoritesOnly: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Kron temple reveal");
  });

  it("creates a new version when an existing prompt body changes", () => {
    const original = demoPrompts[1];
    const updated = createPromptFromDraft(
      {
        id: original.id,
        title: original.title,
        promptText: `${original.promptText}\nAdditional atmosphere note.`,
        category: original.category,
        notes: original.notes,
        model: original.model,
        status: original.status,
        isFavorite: original.isFavorite,
        tags: original.tags.join(", "),
        collections: original.collections.join(", "),
        characters: original.characters.map((entity) => entity.name).join(", "),
        looks: original.looks.map((entity) => entity.name).join(", "),
        scenes: original.scenes.map((entity) => entity.name).join(", "),
        variables: formatVariables(original.variables),
      },
      original,
    );

    expect(updated.versions[0].versionNumber).toBe(4);
    expect(updated.versions[0].promptText).toContain("Additional atmosphere note.");
  });

  it("duplicates prompts as editable non-favorite drafts", () => {
    const draft = duplicatePrompt(demoPrompts[1]);
    expect(draft.id).toBeUndefined();
    expect(draft.title).toBe("Kron temple reveal copy");
    expect(draft.isFavorite).toBe(false);
  });

  it("combines two or three prompts into a provenance-rich draft", () => {
    const draft = combinePrompts([demoPrompts[0], demoPrompts[1], demoPrompts[3]]);

    expect(draft.id).toBeUndefined();
    expect(draft.title).toBe("Combined: Kron base profile + Kron temple reveal + 1 more");
    expect(draft.category).toBe("project");
    expect(draft.isFavorite).toBe(false);
    expect(draft.promptText).toContain("## Source 1: Kron base profile");
    expect(draft.promptText).toContain("## Source 2: Kron temple reveal");
    expect(draft.promptText).toContain("## Source 3: Lush manga shading");
    expect(draft.tags).toContain("combined");
    expect(draft.tags).toContain("Kron");
    expect(draft.collections).toContain("Issue 1: Awakening");
    expect(draft.characters).toBe("Kron");
    expect(draft.looks).toBe("Ceremonial Armor");
    expect(draft.scenes).toBe("Temple Interior");
    expect(draft.variables).toContain("lighting | dramatic | required");
    expect(draft.sourceLabel).toBe("Prompt Library combine");
    expect(draft.sourceContext?.combinedFrom).toHaveLength(3);
    expect(draft.promptSections?.combinedSources).toHaveLength(3);
  });

  it("rejects combine drafts outside the 2 to 3 prompt range", () => {
    expect(() => combinePrompts([demoPrompts[0]])).toThrow("2 to 3");
    expect(() => combinePrompts([demoPrompts[0], demoPrompts[1], demoPrompts[2], demoPrompts[3]])).toThrow("2 to 3");
  });

  it("preserves ARCS provenance metadata when creating prompt records", () => {
    const prompt = createPromptFromDraft({
      title: "Imageshop panel prompt",
      promptText: "Wide panel, obsidian archive chamber, gold rim light.",
      category: "scene",
      notes: "Captured from panel preflight.",
      model: "arcs",
      status: "active",
      isFavorite: false,
      tags: "imageshop, panel",
      collections: "ARCS handoffs",
      characters: "",
      looks: "",
      scenes: "archive chamber",
      variables: "",
      sourcePortal: "lab",
      sourceLabel: "Imageshop panel 03",
      sourceContext: { panelId: "panel-03" },
      promptSections: { main: "Wide panel", lighting: "gold rim light" },
    });

    expect(prompt.sourcePortal).toBe("lab");
    expect(prompt.sourceLabel).toBe("Imageshop panel 03");
    expect(prompt.sourceContext).toEqual({ panelId: "panel-03" });
    expect(prompt.promptSections).toEqual({ main: "Wide panel", lighting: "gold rim light" });
  });
});
