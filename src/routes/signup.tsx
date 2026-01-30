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
import { signUp } from '~/lib/auth/client'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/signup')({
  component: SignUp,
})

export const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters'),

    email: z.email('Enter a valid email address'),

    password: z.string().min(8, 'Password must be at least 8 characters'),

    confirmPassword: z
      .string()
      .min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export type SignUpFormValues = z.infer<typeof signUpSchema>

function SignUp({ className, ...props }: React.ComponentProps<'div'>) {
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value: { email, password, name } }) => {
      await signUp.email(
        {
          email,
          password,
          name,
          callbackURL: '/signin',
        },
        {
          async onSuccess(ctx) {
            toast.success(
              `${ctx.data.user.name} account created successfully`,
              {
                position: 'top-center',
                action: {
                  label: 'Undo',
                  onClick: () => {
                    redirect({ to: '/signin', replace: true })
                  },
                },
              },
            )
            redirect({ to: '/signin', replace: true })
          },
          onError: (ctx) => {
            toast.error(ctx.error.message, {
              position: 'top-center',
              action: {
                label: 'Undo',
                onClick: () => {
                  redirect({ to: '/signup', replace: true })
                },
              },
            })
            redirect({ to: '/signup', replace: true })
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
            <CardContent>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                  Enter your information below to create your account
                </CardDescription>
              </CardHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                <FieldGroup>
                  {/* Full Name */}
                  <form.Field
                    name="name"
                    validators={{
                      onChange: signUpSchema.shape.name,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="John Doe"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldInfo field={field} />
                      </Field>
                    )}
                  </form.Field>

                  {/* Email */}
                  <form.Field
                    name="email"
                    validators={{
                      onChange: signUpSchema.shape.email,
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
                        <FieldDescription>
                          We&apos;ll use this to contact you. We will not share
                          your email with anyone else.
                        </FieldDescription>
                      </Field>
                    )}
                  </form.Field>

                  {/* Password */}
                  <form.Field
                    name="password"
                    validators={{
                      onChange: signUpSchema.shape.password,
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
                        <FieldDescription>
                          Must be at least 8 characters long.
                        </FieldDescription>
                      </Field>
                    )}
                  </form.Field>

                  {/* Confirm Password */}
                  <form.Field name="confirmPassword">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Confirm Password
                        </FieldLabel>
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
                      {form.state.isSubmitting
                        ? 'Creating account…'
                        : 'Create Account'}
                    </Button>

                    <FieldDescription className="px-6 text-center">
                      Already have an account? <Link to="/signin">Sign in</Link>
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
