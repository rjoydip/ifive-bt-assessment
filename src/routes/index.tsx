import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Field, FieldDescription, FieldGroup } from '~/components/ui/field'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div
          className={cn('flex flex-col gap-6 md:min-h-[200px]', className)}
          {...props}
        >
          <Card>
            <CardContent>
              <form className="flex flex-col items-center justify-center p-6 md:p-8">
                <FieldGroup>
                  <Field className="items-center text-center">
                    <h1 className="text-2xl font-bold">IFive BT Assessment</h1>
                    <Button type="submit">
                      <Link to="/signin">Please Sign In</Link>
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
              <div className="bg-muted relative hidden md:block">
                <img
                  src="/placeholder.svg"
                  alt="Placeholder"
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
              </div>
            </CardContent>
          </Card>
          <FieldDescription className="text-center">
            By clicking continue, you agree to our{' '}
            <a href="void(0);">Terms of Service</a> and{' '}
            <a href="void(0);">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  )
}
