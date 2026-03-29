/**
 * System and user prompts for Storyline Studio (Master Director).
 * Creator-driven: use only provided story text and cast/asset context—no demographic defaults.
 */

export const STORYLINE_DIRECTOR_SYSTEM = `You are the Technical Visual Director for serialized image/video production.
Extract entities from the story and map them to the Character/Asset context the user supplies.
Generate prompts focused on TECHNICAL PRECISION: lighting, lens and camera grammar, texture, materials, and VFX.
Organize output chronologically for video segmenting.
Do not inject unstated identity, demographics, or "equity" balancing—honor only what the creator wrote and linked references describe.`;

export function buildScriptDoctorUserPrompt(rawStoryline: string): string {
  return `You are an AI Script Doctor. Rewrite and tighten the following storyline for clarity, pacing, and scene boundaries. Preserve the creator's intent, names, and plot. Output JSON only with this shape:
{"cleanedText": "<single string, may use \\n for paragraphs>"}

Storyline:
---
${rawStoryline.trim()}
---`;
}

export function buildBeatPlannerUserPrompt(args: {
  cleanedText: string;
  intervalSec: number;
  castSummaries: string;
  directorModifiers: string;
}): string {
  return `Split the storyline into timed beats of about ${args.intervalSec} seconds each (last beat may be shorter).
For each beat, produce a technical visual prompt plus camera and audio metadata.
${args.directorModifiers}

Production cast (names and notes—use for consistency when a name appears in beat text):
${args.castSummaries || '(none—rely on story text only)'}

Return JSON only with this shape:
{"beats":[{"text":"narrative line","durationSec":number,"visualPrompt":"detailed technical image prompt","camera":{"shot":"string","angle":"string","movement":"string"},"tone":"string","audio":{"dialogue":"string or empty","sfx":"string or empty"},"tags":["optional asset/character tag ids"]}]}

Story:
---
${args.cleanedText.trim()}
---`;
}

export function buildInterpolationUserPrompt(args: {
  beatText: string;
  visualPrompt: string;
}): string {
  return `Given this story beat and its visual prompt, output JSON only:
{"startFrame":"1–2 sentences: opening keyframe for interpolation","endFrame":"1–2 sentences: closing keyframe"}

Beat: ${args.beatText.trim()}
Visual prompt: ${args.visualPrompt.trim()}`;
}

export function buildDirectorModifierLines(opts: {
  highFashionTechwear: boolean;
  yugiOhComplexity: boolean;
}): string {
  const parts: string[] = [];
  if (opts.highFashionTechwear) {
    parts.push(
      'Director mode: incorporate high-fashion tech-wear—structured silhouettes, technical fabrics, harness/straps, subtle LED accents, runway-adjacent styling unless the story contradicts.'
    );
  }
  if (opts.yugiOhComplexity) {
    parts.push(
      'Director mode: elevate detail and ornament—layered costume jewelry, symbolic accessories, dramatic hair geometry, intricate belts/cards motifs inspired by premium trading-card anime aesthetics (without copying specific IP).'
    );
  }
  return parts.length ? parts.join('\n') : 'No extra director style modes.';
}
