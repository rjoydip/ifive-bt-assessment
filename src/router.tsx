import { createRouter as baseCreateRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const createRouter = () => {
  return baseCreateRouter({ routeTree, defaultPreload: 'intent' })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
