import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageshopImportPanel } from '@/portals/storyline/ImageshopImportPanel';

const persistenceMocks = vi.hoisted(() => ({
  saveImportedImageToCharacterVault: vi.fn(),
  saveImportedImageToAssetVault: vi.fn(),
}));

const imageMocks = vi.hoisted(() => ({
  generateImage: vi.fn(),
}));

vi.mock('@/shared/api/arcsPersistence', () => persistenceMocks);

vi.mock('@/shared/api/geminiImageApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/geminiImageApi')>();
  return { ...actual, generateImage: imageMocks.generateImage };
});

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock('@/shared/api/arcsVault', () => ({
  getCharacterAlbums: vi.fn(async () => []),
}));

vi.mock('@/shared/api/arcsAssetVault', () => ({
  getAssetAlbums: vi.fn(async () => []),
}));

vi.mock('@/components/ui/ArcsStorageImg', () => ({
  ArcsStorageImg: ({ alt = '' }: { alt?: string }) => <img alt={alt} />,
}));

vi.mock('@/shared/components/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/shared/components/SearchableVaultSelect', () => ({
  SearchableVaultSelect: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />,
}));

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:imageshop-import-test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  imageMocks.generateImage.mockReset();
  imageMocks.generateImage.mockResolvedValue({
    ok: true,
    imageDataUrl: 'data:image/png;base64,processed',
  });
  persistenceMocks.saveImportedImageToCharacterVault.mockReset();
  persistenceMocks.saveImportedImageToCharacterVault.mockResolvedValue({
    ok: true,
    id: 'character-image-id',
    imageUrl: 'data:image/png;base64,saved',
  });
});

describe('ImageshopImportPanel', () => {
  it('freezes the current Character target in processed-image metadata', async () => {
    const { container } = render(<ImageshopImportPanel />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInstanceOf(HTMLInputElement);

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [new File(['image'], 'reference.png', { type: 'image/png' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Character Vault' }));
    fireEvent.change(await screen.findByLabelText('Profile name'), {
      target: { value: 'Continuity Lead' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Process' }));

    await waitFor(() => expect(imageMocks.generateImage).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Save to vault' }));

    await waitFor(() => {
      expect(persistenceMocks.saveImportedImageToCharacterVault).toHaveBeenCalledTimes(1);
    });
    expect(persistenceMocks.saveImportedImageToCharacterVault.mock.calls[0][0]).toMatchObject({
      processing: { vaultTarget: 'character' },
    });
  });
});
