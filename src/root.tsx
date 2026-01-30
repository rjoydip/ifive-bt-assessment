import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { scan } from 'react-scan'
import { createRouter } from './router'
import './global.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/sonner'

if (import.meta.env.DEV) {
  scan({
    enabled: import.meta.env.DEV,
  })
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const router = createRouter()
const queryClient = new QueryClient()

const root = ReactDOM.createRoot(rootElement)
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
