import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './App.tsx'
import { ThemeProvider } from '@/shared/context/ThemeContext.tsx'
import { ProjectProvider } from '@/shared/context/ProjectContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </ThemeProvider>
  </StrictMode>,
)
