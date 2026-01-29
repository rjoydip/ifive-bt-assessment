import { createFileRoute } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
} from '~/components/ui/card'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/dashboard/profile')({
  component: Profile,
})

function Profile({ className, ...props }: React.ComponentProps<'div'>) {
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
              src="https://avatar.vercel.sh/shadcn1"
              alt="Event cover"
              className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
            />
            <CardHeader>
              <CardDescription>m@example.com</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full">
                <Lock />
                <span className="mx-2">CN</span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
