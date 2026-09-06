import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CODEX_SESSION,
  parseCollapsedSections,
  parseCodexSession,
} from '../codexSession';

describe('parseCodexSession', () => {
  it('restores a valid session', () => {
    expect(parseCodexSession('{"tab":"vault","zoom":1.25}')).toEqual({
      tab: 'vault',
      zoom: 1.25,
    });
  });

  it('falls back safely for malformed or non-object JSON', () => {
    expect(parseCodexSession('{bad')).toEqual(DEFAULT_CODEX_SESSION);
    expect(parseCodexSession('null')).toEqual(DEFAULT_CODEX_SESSION);
    expect(parseCodexSession('[]')).toEqual(DEFAULT_CODEX_SESSION);
  });

  it('rejects unknown tabs and zoom values that would corrupt layout math', () => {
    expect(parseCodexSession('{"tab":"missing","zoom":"wide"}')).toEqual(DEFAULT_CODEX_SESSION);
    expect(parseCodexSession('{"tab":"layers","zoom":null}')).toEqual({
      tab: 'layers',
      zoom: DEFAULT_CODEX_SESSION.zoom,
    });
    expect(parseCodexSession('{"tab":"sigils","zoom":9}')).toEqual(DEFAULT_CODEX_SESSION);
  });
});

describe('parseCollapsedSections', () => {
  it('keeps only boolean section preferences', () => {
    expect(parseCollapsedSections('{"Effects":true,"Transform":false,"Canon":"yes"}')).toEqual({
      Effects: true,
      Transform: false,
    });
  });

  it('rejects malformed, array, and null storage values', () => {
    expect(parseCollapsedSections('{bad')).toEqual({});
    expect(parseCollapsedSections('[]')).toEqual({});
    expect(parseCollapsedSections('null')).toEqual({});
  });
});
