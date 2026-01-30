import { createFileRoute } from '@tanstack/react-router'
import { Welcome } from '~/components/welcome'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Welcome {...props} />
      </div>
    </div>
  )
}
