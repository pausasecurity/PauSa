import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
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
