import { isServer } from '@tanstack/react-query'
import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient as createAuthClientClient } from 'better-auth/react'

function createAuthClientServer() {
  return {
    signIn() {},
    signOut() {},
    signUp() {},
    deleteUser() {},
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

export type Session = typeof authClient.$Infer.Session
export const admin = authClient.admin
export const { signIn, signOut, signUp, useSession, deleteUser } = authClient
