/** Resolve a file from Vite's public directory under the configured deployment base. */
export function publicAssetUrl(path: string, base = import.meta.env.BASE_URL): string {
  const normalisedBase = `${base.replace(/\/+$/, '')}/`;
  return `${normalisedBase}${path.replace(/^\/+/, '')}`;
}
