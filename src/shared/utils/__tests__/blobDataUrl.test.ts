import { describe, expect, it } from 'vitest';
import { readBlobAsDataUrl } from '@/shared/utils/blobDataUrl';

describe('readBlobAsDataUrl', () => {
  it('converts a blob without creating a lifecycle-bound object URL', async () => {
    const blob = new Blob(['ARCS'], { type: 'text/plain' });

    await expect(readBlobAsDataUrl(blob)).resolves.toBe('data:text/plain;base64,QVJDUw==');
  });
});
