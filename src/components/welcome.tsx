import { Link } from '@tanstack/react-router'
import { ScanFace } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Field, FieldDescription, FieldGroup } from '~/components/ui/field'
import { cn } from '~/lib/utils'

export function Welcome({ className, ...props }: React.ComponentProps<'div'>) {
  return (
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
                  <Link to="/signin" className="flex flex-row gap-2">
                    <ScanFace /> <span>Please Sign In</span>
                  </Link>
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="https://ui.shadcn.com/placeholder.svg"
              alt="Placeholder"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="text-center">
        By clicking continue, you agree to our{' '}
        <Link to="/">Terms of Service</Link> and{' '}
        <Link to="/">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  )
}
