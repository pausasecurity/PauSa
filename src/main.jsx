import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
// Schriften selbst gehostet (DSGVO: keine Requests an Google Fonts)
import '@fontsource/syne/700.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/400-italic.css'
import './index.css'
import './i18n/index.js'
import App from './App.jsx'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
      <LanguageSwitcher />
    </Suspense>
  </StrictMode>,
)
