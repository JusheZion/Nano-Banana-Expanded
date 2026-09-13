import { describe, expect, it } from "vitest";
import { savePrompt } from "./promptRepository";
import type { PromptDraft } from "./types";

describe("prompt repository", () => {
  it("saves relationships through prompt-dossier-owned tables", async () => {
    const calls: Array<{ table: string; action: string }> = [];
    const client = createRecordingClient(calls);

    const draft: PromptDraft = {
      title: "Test prompt",
      promptText: "Describe the scene.",
      category: "scene",
      notes: "",
      model: "gpt-4o",
      status: "active",
      isFavorite: false,
      tags: "cinematic",
      collections: "issue one",
      characters: "Kron",
      looks: "moonlit armor",
      scenes: "temple",
      variables: "angle | wide | required",
      sourcePortal: "writer",
      sourceLabel: "Writer page beats",
      sourceContext: { page: 4 },
      promptSections: { beats: ["arrival", "reveal"] },
    };

    await savePrompt(client as never, { id: "user-1" } as never, draft);

    const tables = calls.map((call) => call.table);
    expect(tables).toContain("prompts");
    expect(tables).toContain("prompt_dossier_tags");
    expect(tables).toContain("prompt_dossier_collections");
    expect(tables).toContain("prompt_dossier_characters");
    expect(tables).toContain("prompt_dossier_looks");
    expect(tables).toContain("prompt_dossier_scenes");
    expect(tables).toContain("prompt_dossier_prompt_tags");
    expect(tables).toContain("prompt_dossier_prompt_collections");
    expect(tables).toContain("prompt_dossier_prompt_characters");
    expect(tables).toContain("prompt_dossier_prompt_looks");
    expect(tables).toContain("prompt_dossier_prompt_scenes");
    expect(tables).toContain("prompt_dossier_variables");
    expect(tables).toContain("prompt_dossier_versions");
    expect(tables).not.toContain("characters");
    expect(tables).not.toContain("prompt_characters");
    expect(calls).toContainEqual({
      table: "prompts",
      action: "upsert",
      payload: expect.objectContaining({
        source_portal: "writer",
        source_label: "Writer page beats",
        source_context: { page: 4 },
        prompt_sections: { beats: ["arrival", "reveal"] },
      }),
    });
  });

  it("stops relationship sync when deleting stale joins fails", async () => {
    const calls: Array<{ table: string; action: string }> = [];
    const client = createRecordingClient(calls, "prompt_dossier_prompt_tags");
    const draft: PromptDraft = {
      title: "Test prompt",
      promptText: "Describe the scene.",
      category: "scene",
      notes: "",
      model: "gpt-4o",
      status: "active",
      isFavorite: false,
      tags: "cinematic",
      collections: "",
      characters: "",
      looks: "",
      scenes: "",
      variables: "",
    };

    await expect(savePrompt(client as never, { id: "user-1" } as never, draft))
      .rejects.toThrow("delete denied");
    expect(calls).not.toContainEqual({
      table: "prompt_dossier_tags",
      action: "upsert",
    });
  });
});

function createRecordingClient(
  calls: Array<{ table: string; action: string; payload?: unknown }>,
  deleteErrorTable?: string,
) {
  return {
    from(table: string) {
      const record = (action: string, payload?: unknown) => calls.push({ table, action, payload });
      const builder = {
        upsert(rows: Array<{ name?: string }> | object) {
          record("upsert", rows);
          return {
            error: null,
            select() {
              const sourceRows = Array.isArray(rows) ? rows : [];
              const result = {
                data: sourceRows.map((row, index) => ({
                  id: `${table}-${index + 1}`,
                  name: row.name ?? `${table}-${index + 1}`,
                })),
                error: null,
                overrideTypes() { return result; },
              };
              return result;
            },
          };
        },
        insert() {
          record("insert");
          return { error: null };
        },
        delete() {
          record("delete");
          if (table === deleteErrorTable) {
            return {
              eq() {
                return {
                  eq() { return { error: new Error("delete denied") }; },
                };
              },
            };
          }
          return builder;
        },
        eq() {
          return builder;
        },
      };
      return builder;
    },
  };
}
