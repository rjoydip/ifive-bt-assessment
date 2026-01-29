import { isServer } from '@tanstack/react-query'
import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient as createAuthClientClient } from 'better-auth/react'

function createAuthClientServer() {
  return {
    signIn() {},
    signOut() {},
    signUp() {},
    useSession() {
      return {
        data: null,
        isPending: false,
        error: null,
      }
    },
  }
}

const createAuthClient: typeof createAuthClientClient = isServer
  ? (createAuthClientServer as any)
  : createAuthClientClient

export const authClient = createAuthClient({
  plugins: [adminClient()],
})

export const { signIn, signOut, signUp, useSession } = authClient
