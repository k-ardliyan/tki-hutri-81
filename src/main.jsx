import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AudienceProvider } from './context/AudienceContext'
import './index.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AudienceProvider>
        <App />
      </AudienceProvider>
    </BrowserRouter>
  </React.StrictMode>
)