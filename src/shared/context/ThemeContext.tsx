import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'crimson' | 'teal' | 'purple' | 'gold' | 'obsidian' | 'wiki';

interface ThemeContextType {
  activeTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState<Theme>('crimson');

  useEffect(() => {
    document.body.classList.remove(
      'theme-crimson',
      'theme-teal',
      'theme-purple',
      'theme-gold',
      'theme-obsidian',
      'theme-wiki',
    );
    document.body.classList.add(`theme-${activeTheme}`);
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme: setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
