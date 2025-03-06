import 'bootstrap/dist/css/bootstrap.min.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'
import { AuthProvider } from './context/AuthContext';

axios.defaults.withCredentials = true

// Lazy load App for faster initial rendering
const App = React.lazy(() => import('./App'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    </AuthProvider>
  </StrictMode>
);