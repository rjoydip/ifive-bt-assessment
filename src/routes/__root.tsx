import type { ErrorComponentProps } from '@tanstack/react-router'
import {
  createRootRouteWithContext,
  ErrorComponent,
  Outlet,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { StrictMode } from 'react'
import { ThemeProvider } from '~/components/theme-provider'

export const Route = createRootRouteWithContext()({
  component: Root,
  errorComponent: RootErrorComponent,
})

function Root() {
  return (
    <StrictMode>
      <ThemeProvider defaultTheme="light" storageKey="theme">
        <Outlet />
        {import.meta.env.DEV && (
          <TanStackRouterDevtools position="bottom-right" />
        )}
      </ThemeProvider>
    </StrictMode>
  )
}

function RootErrorComponent({ error }: ErrorComponentProps) {
  if (error instanceof Error) {
    return <div>{error.message}</div>
  }

  return <ErrorComponent error={error} />
}
