import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObsidianLoreEntry, ObsidianLoreImage } from '@/portals/writer/obsidianLoreImport';
import type {
  CodexChartObject,
  CodexImageObject,
  CodexObject,
  CodexTextObject,
} from '../../types/codexObjects';
import {
  bindableFields,
  bindingPatch,
  indexEntries,
  plainTextFromMarkdown,
  resolveBindings,
  resolveField,
  resolveImageSrc,
} from '../vaultBinding';
import {
  boundableImages,
  findImage,
  heldImageUrlCount,
  probeImageDimensions,
  releaseImageUrls,
} from '../vaultImages';

/**
 * The reported bug: choosing a note and a field wrote the binding and nothing
 * else, so Properties showed "Kron" while the plate still said "TEXT". A
 * binding has to put the value on the object.
 */
function picture(reference: string, resolved = true): ObsidianLoreImage {
  return {
    reference,
    fileName: reference,
    sourcePath: `Vault/assets/${reference}`,
    file: resolved ? new File(['x'], reference, { type: 'image/png' }) : undefined,
    status: resolved ? 'resolved' : 'unresolved',
  } as ObsidianLoreImage;
}

function entry(partial: Partial<ObsidianLoreEntry> = {}): ObsidianLoreEntry {
  return {
    id: 'e1',
    title: 'Kron',
    category: 'character',
    summary: 'A summary.',
    markdownBody: '## Origins\n\nBorn of [[Omnifundus (Kaleid)]] and **fire**.',
    properties: { epithet: 'The Turning', compression: 82 },
    tags: ['twovestellium'],
    links: [],
    linkedLoreReferences: [],
    images: [],
    sourcePath: 'Vault/Characters/Kron.md',
    importDate: '2026-09-07T00:00:00.000Z',
    ...partial,
  } as ObsidianLoreEntry;
}

const base = {
  x: 0, y: 0, width: 100, height: 20, rotation: 0, opacity: 1, locked: false, visible: true,
};

const text = (binding?: CodexTextObject['binding']): CodexTextObject => ({
  ...base, id: 't1', kind: 'text', text: 'TEXT', fontFamily: 'Cinzel', fontSize: 28,
  fontStyle: 'normal', fill: '#d8b45a', align: 'left', lineHeight: 1.4, letterSpacing: 0, binding,
}) as CodexTextObject;

const chart = (axes: CodexChartObject['axes'], binding?: CodexChartObject['binding']): CodexChartObject => ({
  ...base, id: 'c1', kind: 'chart', chartKind: 'radial', axes, max: 100, stroke: '#fff',
  fill: '#fff', track: '#333', labelColor: '#888', fontFamily: 'Cinzel', fontSize: 11,
  showLabels: true, showValues: true, binding,
}) as CodexChartObject;

const image = (binding?: CodexImageObject['binding']): CodexImageObject => ({
  ...base, id: 'i1', kind: 'image', src: '', binding,
}) as CodexImageObject;

beforeEach(() => {
  releaseImageUrls();
  // jsdom has no object URLs.
  let n = 0;
  vi.stubGlobal('URL', Object.assign(Object.create(URL), {
    createObjectURL: () => `blob:test/${++n}`,
    revokeObjectURL: () => {},
  }));
});

describe('bindingPatch — binding puts the value on the object', () => {
  it('fills a text object the moment it is bound', () => {
    const patch = bindingPatch(text(), entry(), {
      notePath: 'Vault/Characters/Kron.md', field: 'title', mode: 'live',
    }) as Partial<CodexTextObject>;
    expect(patch.text).toBe('Kron');
  });

  it('fills on a `once` binding too — once means stop following, not stay empty', () => {
    const patch = bindingPatch(text(), entry(), {
      notePath: 'Vault/Characters/Kron.md', field: 'title', mode: 'once',
    }) as Partial<CodexTextObject>;
    expect(patch.text).toBe('Kron');
  });

  it('changes the value when the field changes', () => {
    const patch = bindingPatch(text(), entry(), {
      notePath: 'Vault/Characters/Kron.md', field: 'properties.epithet', mode: 'live',
    }) as Partial<CodexTextObject>;
    expect(patch.text).toBe('The Turning');
  });

  it('records when it resolved, so staleness can be reported', () => {
    const patch = bindingPatch(text(), entry(), {
      notePath: 'Vault/Characters/Kron.md', field: 'title', mode: 'live',
    }, '2026-09-07T10:00:00.000Z') as Partial<CodexTextObject>;
    expect(patch.binding?.resolvedAt).toBe('2026-09-07T10:00:00.000Z');
  });

  it('keeps the object as it is when the note is gone', () => {
    const patch = bindingPatch(text(), undefined, {
      notePath: 'Vault/Gone.md', field: 'title', mode: 'live',
    }) as Partial<CodexTextObject>;
    expect('text' in patch).toBe(false);
    expect(patch.binding?.notePath).toBe('Vault/Gone.md');
  });

  it('keeps the object as it is when the field is missing', () => {
    const patch = bindingPatch(text(), entry(), {
      notePath: 'Vault/Characters/Kron.md', field: 'properties.nothing', mode: 'live',
    }) as Partial<CodexTextObject>;
    expect('text' in patch).toBe(false);
  });

  it('plots chart axes that already name a field', () => {
    const object = chart([{ label: 'Compression', value: 0, field: 'properties.compression' }]);
    const patch = bindingPatch(object, entry(), {
      notePath: 'Vault/Characters/Kron.md', field: '', mode: 'live',
    }) as Partial<CodexChartObject>;
    expect(patch.axes?.[0].value).toBe(82);
  });

  it('leaves an unbound axis alone', () => {
    const object = chart([{ label: 'Hand-set', value: 40 }]);
    const patch = bindingPatch(object, entry(), {
      notePath: 'Vault/Characters/Kron.md', field: '', mode: 'live',
    }) as Partial<CodexChartObject>;
    expect(patch.axes?.[0].value).toBe(40);
  });
});

describe('body as a bindable field', () => {
  it('is offered', () => {
    expect(bindableFields(entry())).toContain('body');
  });

  it('resolves to the note prose', () => {
    expect(resolveField(entry(), 'body')).toBe('Origins\n\nBorn of Omnifundus (Kaleid) and fire.');
  });

  it('binds onto a text object', () => {
    const patch = bindingPatch(text(), entry(), {
      notePath: 'Vault/Characters/Kron.md', field: 'body', mode: 'live',
    }) as Partial<CodexTextObject>;
    expect(patch.text).toContain('Born of Omnifundus (Kaleid)');
  });
});

describe('plainTextFromMarkdown', () => {
  it('drops heading markers but keeps the heading', () => {
    expect(plainTextFromMarkdown('### Origins')).toBe('Origins');
  });

  it('keeps a wikilink target, and the label when one is given', () => {
    expect(plainTextFromMarkdown('[[Kaleid]] and [[Onyx|the coder]]')).toBe('Kaleid and the coder');
  });

  it('drops embedded images — they are not prose', () => {
    expect(plainTextFromMarkdown('before ![[portrait.png]] after')).toBe('before  after');
  });

  it('unwraps emphasis, including triple', () => {
    expect(plainTextFromMarkdown('*a* **b** ***c*** ~~d~~')).toBe('a b c d');
  });

  it('keeps list text without the bullet', () => {
    expect(plainTextFromMarkdown('- one\n- two')).toBe('one\ntwo');
  });

  it('keeps a markdown link label', () => {
    expect(plainTextFromMarkdown('see [the note](http://x)')).toBe('see the note');
  });

  it('collapses the blank lines stripping leaves behind', () => {
    expect(plainTextFromMarkdown('a\n\n\n\n---\n\n\nb')).toBe('a\n\nb');
  });

  it('leaves plain prose untouched', () => {
    expect(plainTextFromMarkdown('Just a sentence.')).toBe('Just a sentence.');
  });
});

describe('pictures', () => {
  const withArt = entry({ images: [picture('portrait.png'), picture('missing.png', false)] });

  it('offers only embeds that resolved to a real file', () => {
    expect(boundableImages(withArt).map((i) => i.reference)).toEqual(['portrait.png']);
  });

  it('finds an embed by the reference the note writes', () => {
    expect(findImage(withArt, 'portrait.png')?.fileName).toBe('portrait.png');
    expect(findImage(withArt, 'nope.png')).toBeUndefined();
  });

  it('resolves to a drawable url', () => {
    expect(resolveImageSrc(withArt, 'portrait.png')).toMatch(/^blob:/);
  });

  it('returns null when the embed is gone from the note', () => {
    expect(resolveImageSrc(withArt, 'gone.png')).toBeNull();
  });

  it('hands back the same url for the same file rather than leaking one per call', () => {
    const first = resolveImageSrc(withArt, 'portrait.png');
    const second = resolveImageSrc(withArt, 'portrait.png');
    expect(second).toBe(first);
    expect(heldImageUrlCount()).toBe(1);
  });

  it('re-mints when the vault is read again and the file object is new', () => {
    const first = resolveImageSrc(withArt, 'portrait.png');
    const reread = entry({ images: [picture('portrait.png')] });
    expect(resolveImageSrc(reread, 'portrait.png')).not.toBe(first);
    expect(heldImageUrlCount()).toBe(1);
  });

  it('binds a picture object to an embed', () => {
    const patch = bindingPatch(image(), withArt, {
      notePath: withArt.sourcePath, field: 'portrait.png', mode: 'live',
    }) as Partial<CodexImageObject>;
    expect(patch.src).toMatch(/^blob:/);
  });

  it('leaves the plate picture alone when the embed has gone', () => {
    const patch = bindingPatch(image(), withArt, {
      notePath: withArt.sourcePath, field: 'gone.png', mode: 'live',
    }) as Partial<CodexImageObject>;
    expect('src' in patch).toBe(false);
  });
});

describe('image dimension probing', () => {
  it('detaches a pending image probe when its placement is cancelled', async () => {
    const probes: Array<{
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
      naturalWidth: number;
      naturalHeight: number;
    }> = [];
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      naturalWidth = 800;
      naturalHeight = 1200;
      constructor() { probes.push(this); }
    }
    vi.stubGlobal('Image', FakeImage);
    const controller = new AbortController();
    const dimensions = probeImageDimensions('blob:test/portrait', controller.signal);

    controller.abort();

    await expect(dimensions).rejects.toMatchObject({ name: 'AbortError' });
    expect(probes[0]).toMatchObject({ onload: null, onerror: null, src: '' });
  });
});

describe('resolveBindings on a vault re-read', () => {
  const withArt = entry({ images: [picture('portrait.png')] });
  const index = indexEntries([withArt]);

  it('re-mints a bound picture, because last session url is dead', () => {
    const object = image({ notePath: withArt.sourcePath, field: 'portrait.png', mode: 'live' });
    object.src = 'blob:from-a-previous-session';
    const report = resolveBindings([object as CodexObject], index);
    expect((report.patches[0].patch as Partial<CodexImageObject>).src).toMatch(/^blob:test/);
  });

  it('reports a picture whose embed vanished instead of blanking it', () => {
    const object = image({ notePath: withArt.sourcePath, field: 'gone.png', mode: 'live' });
    const report = resolveBindings([object as CodexObject], index);
    expect(report.patches).toEqual([]);
    expect(report.missingFields[0].field).toBe('gone.png');
  });

  it('leaves a `once` picture alone', () => {
    const object = image({ notePath: withArt.sourcePath, field: 'portrait.png', mode: 'once' });
    expect(resolveBindings([object as CodexObject], index).patches).toEqual([]);
  });
});
