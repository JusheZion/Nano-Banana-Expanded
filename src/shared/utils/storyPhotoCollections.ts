/**
 * Saved story/comic photo collections for "Cast in Story".
 * Persisted to localStorage until backend exists.
 */

const STORAGE_KEY = 'arcs-story-photo-collections';

export interface StoryPhotoCollection {
  id: string;
  name?: string;
  characterRefs: string[];
}

function load(): StoryPhotoCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function save(list: StoryPhotoCollection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getStoryPhotoCollections(): StoryPhotoCollection[] {
  return load();
}

export function addCharacterRefToStory(storyId: string, url: string): void {
  const list = load();
  const item = list.find((s) => s.id === storyId);
  if (item) {
    item.characterRefs = [...(item.characterRefs || []), url];
    save(list);
  } else {
    list.push({ id: storyId, name: storyId, characterRefs: [url] });
    save(list);
  }
}

export function ensureStoryExists(id: string, name?: string): void {
  const list = load();
  if (list.some((s) => s.id === id)) return;
  list.push({ id, name, characterRefs: [] });
  save(list);
}
