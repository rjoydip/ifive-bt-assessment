import { revalidateLogic, useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldInfo } from '~/components/form-field-info'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { signIn } from '~/lib/auth/client'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/signin')({
  component: SignIn,
})

export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignInFormValues = z.infer<typeof signInSchema>

function SignIn({ className, ...props }: React.ComponentProps<'div'>) {
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value: { email, password } }) => {
      await signIn.email(
        { email, password, callbackURL: '/dashboard' },
        {
          async onSuccess(ctx) {
            toast.success(`${ctx.data.user.name} logged in successfully`, {
              position: 'top-center',
              action: {
                label: 'Undo',
                onClick: () => {
                  redirect({ to: '/dashboard', replace: true })
                },
              },
            })
            redirect({ to: '/dashboard', replace: true })
          },
          onError: (ctx) => {
            if (ctx.error.status === 403) {
              toast.error('Please verify your email address', {
                position: 'top-center',
                action: {
                  label: 'Undo',
                  onClick: () => {
                    redirect({ to: '/', replace: true })
                  },
                },
              })
            }
            toast.error(ctx.error.message, {
              position: 'top-center',
              action: {
                label: 'Undo',
                onClick: () => {
                  redirect({ to: '/', replace: true })
                },
              },
            })
            redirect({ to: '/', replace: true })
          },
        },
      )
    },
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div
          className={cn('flex flex-col gap-6 md:min-h-[200px]', className)}
          {...props}
        >
          <Card>
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                <FieldGroup>
                  {/* Email */}
                  <form.Field
                    name="email"
                    validators={{
                      onChange: signInSchema.shape.email,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input
                          id={field.name}
                          type="email"
                          placeholder="m@example.com"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldInfo field={field} />
                      </Field>
                    )}
                  </form.Field>

                  {/* Password */}
                  <form.Field
                    name="password"
                    validators={{
                      onChange: signInSchema.shape.password,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <Input
                          id={field.name}
                          type="password"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldInfo field={field} />
                      </Field>
                    )}
                  </form.Field>

                  {/* Submit */}
                  <Field>
                    <Button type="submit" disabled={form.state.isSubmitting}>
                      {form.state.isSubmitting ? 'Logging in…' : 'Login'}
                    </Button>

                    <FieldDescription className="text-center">
                      Don&apos;t have an account?{' '}
                      <Link to="/signup">Sign up</Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
