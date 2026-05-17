import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Añade estas dos líneas mágicas:
import 'leaflet/dist/leaflet.css'
import 'mapillary-js/dist/mapillary.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)