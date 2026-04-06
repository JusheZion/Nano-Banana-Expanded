import assetsMd from './assets.md?raw';
import comicMd from './comic.md?raw';
import homeMd from './home.md?raw';
import labMd from './lab.md?raw';
import referenceMd from './reference.md?raw';
import studioMd from './studio.md?raw';
import writerMd from './writer.md?raw';

/** Raw markdown by chapter id (matches {@link WIKI_CHAPTERS} `id`). */
export const wikiMarkdownById: Record<string, string> = {
  home: homeMd,
  studio: studioMd,
  assets: assetsMd,
  reference: referenceMd,
  lab: labMd,
  comic: comicMd,
  writer: writerMd,
};
