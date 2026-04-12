import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { applyDeploymentVersion } from './lib/deploymentCache.js'
import './index.css'

function renderBootstrapScreen({ title, description, showSpinner = true }) {
  const root = document.getElementById('root')
  if (!root) return

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:flex-start;justify-content:center;background:linear-gradient(180deg,#edf4ff 0%,#f7fbff 100%);padding:clamp(72px,14vh,152px) 24px 24px;">
      <div style="width:min(100%,420px);border-radius:28px;border:1px solid rgba(120,171,218,0.18);background:rgba(255,255,255,0.88);box-shadow:0 24px 50px rgba(15,30,61,0.10);padding:28px 24px;text-align:center;">
        <img src="/loading-logo.png" alt="FlashMat" style="width:min(100%,230px);object-fit:contain;margin:0 auto 16px;display:block;" />
        <div style="font-family:var(--display);font-size:28px;line-height:1;color:#15314f;margin-bottom:10px;">${title}</div>
        <div style="font-size:14px;line-height:1.7;color:#6e86a0;margin-bottom:${showSpinner ? '18px' : '0'};">${description}</div>
        ${showSpinner ? '<div style="width:38px;height:38px;border-radius:50%;border:3px solid rgba(37,99,235,0.14);border-top-color:#2563eb;margin:0 auto;animation:flashmat-spin .8s linear infinite;"></div>' : ''}
      </div>
    </div>
    <style>
      @keyframes flashmat-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  `
}

async function bootstrap() {
  renderBootstrapScreen({
    title: 'Loading FlashMat',
    description: 'Preparing your page and recent activity.',
  })

  try {
    await applyDeploymentVersion()

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    )
  } catch (error) {
    console.error('FlashMat bootstrap failed:', error)
    renderBootstrapScreen({
      title: 'Reload FlashMat',
      description: 'A loading issue happened before the app finished opening. Refreshing the page should fix it.',
      showSpinner: false,
    })
  }
}

bootstrap()
