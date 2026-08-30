import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument } from '@/stores/codexStore';
import {
  deserializeDocument,
  listDocuments,
  loadDocument,
  saveDocument,
} from '../codexPersistence';

describe('codex persistence validation', () => {
  beforeEach(() => localStorage.clear());

  it('rejects documents with no usable plates', () => {
    expect(deserializeDocument(JSON.stringify({
      id: 'broken',
      title: 'Broken',
      plates: [],
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
      schemaVersion: 1,
    }))).toBeNull();
  });

  it('rejects malformed object records instead of trusting parsed JSON', () => {
    const doc = createDocument();
    doc.plates[0].objects.push({ kind: 'text' } as never);
    expect(deserializeDocument(JSON.stringify(doc))).toBeNull();
  });

  it('rejects chart and plate dimensions that would produce invalid canvas geometry', () => {
    const doc = createDocument();
    doc.plates[0].width = 0;
    expect(deserializeDocument(JSON.stringify(doc))).toBeNull();

    const chartDoc = createDocument();
    chartDoc.plates[0].objects.push({
      id: 'chart', kind: 'chart', name: 'Chart', x: 0, y: 0, width: 100, height: 100,
      rotation: 0, opacity: 1, locked: false, visible: true, chartKind: 'bars', axes: [],
      max: 0, stroke: '#fff', fill: '#fff', track: '#333', labelColor: '#888',
      fontFamily: 'Cinzel', fontSize: 11, showLabels: true, showValues: true,
    });
    expect(deserializeDocument(JSON.stringify(chartDoc))).toBeNull();
  });

  it('ignores a corrupt summary index rather than throwing during sort', () => {
    localStorage.setItem('codex.documents.v1', JSON.stringify({ updatedAt: null }));
    expect(listDocuments()).toEqual([]);
  });

  it('rejects a malformed saved record at load time', () => {
    localStorage.setItem('codex.document.v1.bad', JSON.stringify({ id: 'bad', plates: 'nope' }));
    expect(loadDocument('bad')).toBeNull();
  });

  it('reports storage write failure without throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(saveDocument(createDocument())).toBeNull();
    spy.mockRestore();
  });

  it('treats blocked storage reads as unavailable rather than crashing the portal', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(listDocuments()).toEqual([]);
    expect(loadDocument('anything')).toBeNull();
    spy.mockRestore();
  });
});
