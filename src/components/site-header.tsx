import { Separator } from '@radix-ui/react-separator'
import { Link } from '@tanstack/react-router'
import { ArrowUpCircleIcon, LogIn } from 'lucide-react'
import { NavUser } from '~/components/nav-user'
import { useSession } from '~/lib/auth/client'

export function SiteHeader() {
  const { data } = useSession()
  const user = data?.user

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <Link to="/dashboard" className="flex flex-row">
          <ArrowUpCircleIcon className="h5 w5" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">IFive BT</h1>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <NavUser />
          ) : (
            <Link to="/signin">
              <LogIn />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
