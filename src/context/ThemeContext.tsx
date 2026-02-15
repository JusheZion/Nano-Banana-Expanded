import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'crimson' | 'teal' | 'purple' | 'gold';

interface ThemeContextType {
  activeTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState<Theme>('crimson'); // Default to Hub

  useEffect(() => {
    // Remove old theme classes
    document.body.classList.remove('theme-crimson', 'theme-teal', 'theme-purple', 'theme-gold');
    // Add new theme class
    document.body.classList.add(`theme-${activeTheme}`);
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme: setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
