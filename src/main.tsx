import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './App.tsx'
import { ThemeProvider } from '@/shared/context/ThemeContext.tsx'
import { ProjectProvider } from '@/shared/context/ProjectContext.tsx'
import { AuthProvider } from '@/shared/context/AuthContext'
import { ResponsiveLayoutProvider } from '@/shared/context/ResponsiveLayoutContext'

/** Dev-only: confirms Vite injected the Gemini key (boolean only; never log the key). */
if (import.meta.env.DEV) {
  console.info('[ARCS] VITE_GEMINI_API_KEY loaded:', Boolean(import.meta.env.VITE_GEMINI_API_KEY))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ResponsiveLayoutProvider>
      <ThemeProvider>
        <AuthProvider>
          <ProjectProvider>
            <App />
          </ProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </ResponsiveLayoutProvider>
  </StrictMode>,
)
