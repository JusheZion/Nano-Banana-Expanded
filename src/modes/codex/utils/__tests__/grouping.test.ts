import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetGroupIds,
  asGroup,
  expandGroups,
  groupMembers,
  groupsIn,
  newGroupId,
  regroupCopies,
  transformableIds,
} from '../grouping';
import type { CodexObject } from '../../types/codexObjects';

function obj(id: string, groupId?: string, locked = false): CodexObject {
  return {
    id,
    kind: 'frame',
    variant: 'plain',
    stroke: '#fff',
    strokeWidth: 1,
    cornerRadius: 0,
    x: 0, y: 0, width: 10, height: 10,
    rotation: 0, opacity: 1, locked, visible: true,
    ...(groupId ? { groupId } : {}),
  } as CodexObject;
}

beforeEach(() => __resetGroupIds());

describe('newGroupId', () => {
  it('never repeats', () => {
    const ids = new Set([newGroupId(), newGroupId(), newGroupId()]);
    expect(ids.size).toBe(3);
  });
});

describe('expandGroups', () => {
  // The reported bug: a Diamond Rule places a rule and a mark, and clicking
  // the mark selected only the mark, so the line was left behind on the drag.
  const divider = [obj('rule', 'g1'), obj('mark', 'g1'), obj('loose')];

  it('takes the whole group when one member is picked', () => {
    expect(expandGroups(divider, ['mark'])).toEqual(['rule', 'mark']);
  });

  it('leaves an ungrouped object alone', () => {
    expect(expandGroups(divider, ['loose'])).toEqual(['loose']);
  });

  it('returns members in plate order, not click order', () => {
    expect(expandGroups(divider, ['mark', 'rule'])).toEqual(['rule', 'mark']);
  });

  it('spans several groups at once', () => {
    const objects = [obj('a', 'g1'), obj('b', 'g1'), obj('c', 'g2'), obj('d', 'g2')];
    expect(expandGroups(objects, ['a', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('mixes a group with a loose object', () => {
    expect(expandGroups(divider, ['rule', 'loose'])).toEqual(['rule', 'mark', 'loose']);
  });

  it('drops ids that are not on the plate', () => {
    expect(expandGroups(divider, ['ghost'])).toEqual([]);
  });

  it('never duplicates an id', () => {
    const ids = expandGroups(divider, ['rule', 'mark']);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('groupMembers', () => {
  it('lists a group', () => {
    expect(groupMembers([obj('a', 'g1'), obj('b'), obj('c', 'g1')], 'g1')).toEqual(['a', 'c']);
  });
});

describe('groupsIn', () => {
  it('reports the groups a selection touches', () => {
    const objects = [obj('a', 'g1'), obj('b', 'g2'), obj('c')];
    expect(groupsIn(objects, ['a', 'b', 'c'])).toEqual(['g1', 'g2']);
  });

  it('is empty for a selection of loose objects, so Ungroup stays disabled', () => {
    expect(groupsIn([obj('a'), obj('b')], ['a', 'b'])).toEqual([]);
  });
});

describe('asGroup', () => {
  it('binds a multi-object fragment together', () => {
    const grouped = asGroup([obj('a'), obj('b'), obj('c')]);
    const ids = new Set(grouped.map((o) => o.groupId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toBeTruthy();
  });

  it('leaves a single object ungrouped — a group of one can only confuse', () => {
    expect(asGroup([obj('a')])[0].groupId).toBeUndefined();
  });

  it('gives each placement its own group', () => {
    const first = asGroup([obj('a'), obj('b')])[0].groupId;
    const second = asGroup([obj('c'), obj('d')])[0].groupId;
    expect(first).not.toBe(second);
  });
});

describe('regroupCopies', () => {
  it('re-keys a copied group so it does not merge with the original', () => {
    const copies = regroupCopies([obj('a', 'g1'), obj('b', 'g1')]);
    expect(copies[0].groupId).toBe(copies[1].groupId);
    expect(copies[0].groupId).not.toBe('g1');
  });

  it('keeps two copied groups apart', () => {
    const copies = regroupCopies([obj('a', 'g1'), obj('b', 'g1'), obj('c', 'g2')]);
    expect(copies[0].groupId).toBe(copies[1].groupId);
    expect(copies[2].groupId).not.toBe(copies[0].groupId);
  });

  it('leaves loose objects loose', () => {
    expect(regroupCopies([obj('a')])[0].groupId).toBeUndefined();
  });
});

describe('transformableIds', () => {
  // Konva's Transformer moves every node attached to it and ignores each
  // node's own `draggable`, so a locked object left on it travels with the
  // selection — the exact thing locking is supposed to stop.
  it('keeps a locked object off the transformer', () => {
    const objects = [obj('rule', 'g1'), obj('mark', 'g1', true)];
    expect(transformableIds(objects, ['rule', 'mark'])).toEqual(['rule']);
  });

  it('passes an unlocked selection through untouched', () => {
    const objects = [obj('a'), obj('b')];
    expect(transformableIds(objects, ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns nothing when the whole selection is locked', () => {
    const objects = [obj('a', undefined, true)];
    expect(transformableIds(objects, ['a'])).toEqual([]);
  });

  it('keeps the selection order it was given', () => {
    const objects = [obj('a'), obj('b'), obj('c')];
    expect(transformableIds(objects, ['c', 'a'])).toEqual(['c', 'a']);
  });
});
