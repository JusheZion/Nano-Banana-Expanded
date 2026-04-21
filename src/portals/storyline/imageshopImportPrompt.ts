/**
 * Prompt builder for Illustrator's Imageshop — import external image, process via Gemini.
 * Aspect ratio is applied by {@link generateImage} (see geminiImageApi); this text avoids duplicating it.
 */

export const IMAGESHOP_IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024;

export type ImageshopImportPromptInput = {
  /** Light cleanup / clarity (generative; not true super-resolution). */
  retouch: boolean;
  /** Empty = do not impose a named art style (still follow reference). */
  stylePreset: string;
  /** Free-form style notes appended when non-empty. */
  styleExtra: string;
  /** Optional user instructions (lighting, mood, etc.). */
  userNote: string;
};

export function buildImageshopImportPrompt(input: ImageshopImportPromptInput): string {
  const lines: string[] = [];

  lines.push(
    'Use the provided reference image as the primary visual source. Produce a single improved output image.'
  );
  lines.push(
    'Preserve the main subject, identity, pose, and composition unless reframing is required to match the aspect ratio given in the generation settings below. Do not replace the subject with a different person, object, or scene.'
  );

  if (input.retouch) {
    lines.push(
      'Apply a light retouch: reduce visible noise and compression artifacts where present, improve clarity and natural color balance. Keep identity and scene content faithful to the reference.'
    );
  }

  const preset = input.stylePreset.trim();
  const extra = input.styleExtra.trim();
  if (preset) {
    lines.push(`Render the final image in this art style: ${preset}.`);
  }
  if (extra) {
    lines.push(`Additional style direction: ${extra}`);
  }

  const note = input.userNote.trim();
  if (note) {
    lines.push(`Additional instructions from the author: ${note}`);
  }

  return lines.join('\n\n');
}
