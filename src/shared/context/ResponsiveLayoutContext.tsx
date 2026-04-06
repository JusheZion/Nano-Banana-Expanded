import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Matches Tailwind `md` (768) and `lg` (1024). */
const PHONE_MAX_PX = 767;
const TABLET_MAX_PX = 1023;

export type ResponsiveLayout = {
  width: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True when device reports fine pointer + hover (desktop-class). */
  prefersHoverSidebar: boolean;
};

const ResponsiveLayoutContext = createContext<ResponsiveLayout | null>(null);

function readPrefersHoverSidebar(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function readWidth(): number {
  if (typeof window === 'undefined') return 1280;
  return window.innerWidth;
}

export function ResponsiveLayoutProvider({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(readWidth);
  const [prefersHoverSidebar, setPrefersHoverSidebar] = useState(readPrefersHoverSidebar);

  const onResize = useCallback(() => {
    setWidth(readWidth());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [onResize]);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setPrefersHoverSidebar(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const value = useMemo<ResponsiveLayout>(() => {
    const isPhone = width <= PHONE_MAX_PX;
    const isTablet = !isPhone && width <= TABLET_MAX_PX;
    const isDesktop = width > TABLET_MAX_PX;
    return { width, isPhone, isTablet, isDesktop, prefersHoverSidebar };
  }, [width, prefersHoverSidebar]);

  return (
    <ResponsiveLayoutContext.Provider value={value}>
      {children}
    </ResponsiveLayoutContext.Provider>
  );
}

export function useResponsiveLayout(): ResponsiveLayout {
  const ctx = useContext(ResponsiveLayoutContext);
  if (!ctx) {
    throw new Error('useResponsiveLayout must be used within ResponsiveLayoutProvider');
  }
  return ctx;
}
