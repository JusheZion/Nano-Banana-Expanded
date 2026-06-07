import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorylineStudio } from '@/portals/storyline/StorylineStudio';
import { ThemeProvider } from '@/shared/context/ThemeContext';
import { useStorylineStudioStore } from '@/stores/storylineStudioStore';
import { useStudioImportBridge } from '@/stores/studioImportBridge';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';

const imageLabRenderSpy = vi.hoisted(() => vi.fn());

vi.mock('@/portals/storyline/GenericImageLabPanel', () => ({
  GenericImageLabPanel: () => {
    imageLabRenderSpy();
    return <section data-testid="imageshop-primary-workspace">Image Lab</section>;
  },
}));

vi.mock('@/shared/components/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/ui/ArcsStorageImg', () => ({
  ArcsStorageImg: ({ alt = '', className = '' }: { alt?: string; className?: string }) => (
    <img alt={alt} className={className} />
  ),
}));

vi.mock('@/shared/api/arcsVault', () => ({
  getCharacterAlbums: vi.fn(async () => []),
}));

vi.mock('@/shared/api/arcsAssetVault', () => ({
  getAssetAlbums: vi.fn(async () => []),
}));

vi.mock('@/shared/api/arcsPersistence', () => ({
  saveStorySequenceToAssetsVault: vi.fn(),
}));

vi.mock('@/shared/api/geminiTextApi', () => ({
  generateGeminiText: vi.fn(),
}));

vi.mock('@/shared/api/geminiImageApi', () => ({
  generateImage: vi.fn(),
}));

function renderStorylineStudio() {
  return render(
    <ThemeProvider>
      <StorylineStudio />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  imageLabRenderSpy.mockClear();
  useStorylineStudioStore.setState(useStorylineStudioStore.getInitialState(), true);
  useStudioImportBridge.setState(useStudioImportBridge.getInitialState(), true);
  useImageWorkshopBridge.setState(useImageWorkshopBridge.getInitialState(), true);
});

describe('StorylineStudio Imageshop layout', () => {
  it('places Image Lab before production libraries, timeline, preview, and beat detail', () => {
    renderStorylineStudio();

    const imageLab = screen.getByTestId('imageshop-primary-workspace');
    const secondarySurfaces = [
      screen.getByText('Production cast'),
      screen.getByText('Beat timeline'),
      screen.getByText('Selected frame preview'),
      screen.getByText('Beat detail'),
    ];

    secondarySurfaces.forEach((surface) => {
      expect(imageLab.compareDocumentPosition(surface) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('does not rerender Image Lab for unrelated Storyline store writes', () => {
    renderStorylineStudio();
    const renderCount = imageLabRenderSpy.mock.calls.length;

    act(() => {
      useStorylineStudioStore.getState().setRawStoryline('Unrelated raw storyline update');
    });

    expect(imageLabRenderSpy).toHaveBeenCalledTimes(renderCount);
  });
});
