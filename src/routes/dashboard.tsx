import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { MembersTable } from '~/components/members-table'
import { SiteHeader } from '~/components/site-header'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { Welcome } from '~/components/welcome'
import { useSession } from '~/lib/auth/client'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
  loader: async () => {
    const { data: getUsers } = await (await fetch('/api/users')).json()
    return {
      getUsers: getUsers,
    }
  },
})

function Dashboard() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { getUsers } = Route.useLoaderData()
  const { data } = useSession()
  const user = data?.user
  const isAdmin = user?.role === 'admin'

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-2 py-2 md:gap-4 md:py-4">
              <SiteHeader />
              {!user || !data ? (
                <Welcome />
              ) : currentPath === '/dashboard' ? (
                isAdmin ? (
                  <MembersTable data={getUsers} />
                ) : (
                  <Card className="relative mx-auto w-full max-w-sm pt-0">
                    <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
                    <img
                      src={
                        user?.image ?? 'https://ui.shadcn.com/placeholder.svg'
                      }
                      alt={user?.name}
                      className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
                    />
                    <CardHeader>
                      <CardTitle>{user?.name}</CardTitle>
                      <CardDescription>
                        You have limited access with your current role. Contact
                        an admin for additional permissions.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter></CardFooter>
                  </Card>
                )
              ) : (
                <Outlet />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
