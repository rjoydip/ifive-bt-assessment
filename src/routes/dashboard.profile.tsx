import { createFileRoute } from '@tanstack/react-router'
import { UserCheck, UserLock } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { useSession } from '~/lib/auth/client'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/dashboard/profile')({
  component: Profile,
})

function Profile({ className, ...props }: React.ComponentProps<'div'>) {
  const { data, isPending } = useSession()

  const user = data?.user

  if (isPending) return null
  if (!user) return null // or redirect to login

  const initials =
    user.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'

  const isAdmin = user.role === 'admin'

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div
          className={cn('flex flex-col gap-6 md:min-h-[200px]', className)}
          {...props}
        >
          <Card className="relative mx-auto w-full max-w-sm pt-0">
            <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
            <img
              src={user.image ?? 'https://ui.shadcn.com/placeholder.svg'}
              alt={user.name}
              className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
            />
            <CardHeader>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full">
                {isAdmin ? <UserLock /> : <UserCheck />}
                <span className="mx-2">{initials}</span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
