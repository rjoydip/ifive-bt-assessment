import { revalidateLogic, useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { addDays } from 'date-fns'
import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'
import { z } from 'zod'
import { FieldInfo } from '~/components/form-field-info'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { useSession } from '~/lib/auth/client'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/dashboard/leave/credits')({
  component: LeaveCredit,
})

async function fetchUsers(query: string) {
  const response = await fetch(
    `/api/users?search=${encodeURIComponent(query)}&roles=users,admin`,
  )
  const { data } = await response.json()
  return data
}

const today = new Date()
const defaultExpire = addDays(today, 60)

export const leaveCreditSchema = z.object({
  userIds: z.array(z.string()).default([]),
  credits: z
    .number({ message: 'Enter credits' })
    .positive('Credits must be greater than 0'),
  expiresAt: z.date().refine((d) => !d || defaultExpire > today, {
    message: 'Expiration must be a future date',
  }),
  hoursPerDay: z.number().min(1).max(24),
  notes: z.string().default(''),
  created_by: z.string().default(''),
})

export type LeaveCreditValues = z.infer<typeof leaveCreditSchema>

/* -------------------------------------------------- */
/* Custom Hook for Debounced Value */
/* -------------------------------------------------- */

function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/* -------------------------------------------------- */
/* Component                                          */
/* -------------------------------------------------- */

export function LeaveCredit({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { data } = useSession()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Debounce the search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Use TanStack Query to fetch users with debounced search
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', debouncedSearchQuery],
    queryFn: () => fetchUsers(debouncedSearchQuery),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })

  const form = useForm({
    defaultValues: {
      userIds: [] as string[],
      credits: 0,
      hoursPerDay: 8,
      expiresAt: defaultExpire,
      notes: '',
      created_by: data?.user.id,
    },
    validationLogic: revalidateLogic(),
    validators: {
      // @ts-expect-error (TanStack typing issue with zod schemas)
      onSubmit: leaveCreditSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = {
        ...value,
        applyToAll: value.userIds.length === 0,
      }

      console.log('Leave credit payload:', payload)
    },
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div
          className={cn('flex flex-col gap-6 md:min-h-[200px]', className)}
          {...props}
        >
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Post Leave Credits</CardTitle>
              <CardDescription>
                Assign leave credits to a user with expiration date
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
                  {/* -------------------------------- USER AUTOCOMPLETE ------------------------------- */}
                  <form.Field name="userIds">
                    {(field) => {
                      const selectedIds = field.state.value

                      const toggleUser = (id: string) => {
                        if (selectedIds.includes(id)) {
                          field.handleChange(
                            selectedIds.filter((x) => x !== id),
                          )
                        } else {
                          field.handleChange([...selectedIds, id])
                        }
                      }

                      return (
                        <Field>
                          <FieldLabel>Users</FieldLabel>

                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between"
                              >
                                {selectedIds.length === 0
                                  ? 'All users'
                                  : `${selectedIds.length} user(s) selected`}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>

                            <PopoverContent className="p-0 w-full">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search users..."
                                  value={searchQuery}
                                  onValueChange={setSearchQuery}
                                />

                                <CommandList>
                                  <CommandGroup>
                                    {isLoading ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        Loading...
                                      </div>
                                    ) : users.length === 0 ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        No users found
                                      </div>
                                    ) : (
                                      users.map((u: any) => (
                                        <CommandItem
                                          key={u.id}
                                          value={u.id}
                                          onSelect={() => toggleUser(u.id)}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              selectedIds.includes(u.id)
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          {u.name}
                                        </CommandItem>
                                      ))
                                    )}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          <FieldDescription>
                            Leave empty to apply to all users
                          </FieldDescription>

                          <FieldInfo field={field} />
                        </Field>
                      )
                    }}
                  </form.Field>

                  {/* -------------------------------- CREDITS ------------------------------- */}
                  <form.Field
                    name="credits"
                    validators={{
                      onChange: leaveCreditSchema.shape.credits,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel>Leave Credits</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                        />
                        <FieldInfo field={field} />
                      </Field>
                    )}
                  </form.Field>

                  {/* -------------------------------- HOURS PER DAY ------------------------------- */}
                  <form.Field
                    name="hoursPerDay"
                    validators={{
                      onChange: leaveCreditSchema.shape.hoursPerDay,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel>Hours per day</FieldLabel>

                        <Input
                          type="number"
                          min={1}
                          max={24}
                          step={0.5}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                        />

                        <FieldDescription>Default is 8 hours</FieldDescription>

                        <FieldInfo field={field} />
                      </Field>
                    )}
                  </form.Field>

                  {/* -------------------------------- DATE ------------------------------- */}
                  <form.Field name="expiresAt">
                    {(field) => (
                      <Field>
                        <FieldLabel>Expiration Date</FieldLabel>

                        <Calendar
                          mode="single"
                          className="rounded-md border shadow-sm"
                          selected={field.state.value}
                          onSelect={(d) =>
                            field.handleChange(new Date(d?.toString() ?? today))
                          }
                        />

                        <FieldInfo field={field} />
                      </Field>
                    )}
                  </form.Field>

                  {/* -------------------------------- NOTES ------------------------------- */}
                  <form.Field name="notes">
                    {(field) => (
                      <Field>
                        <FieldLabel>Notes (optional)</FieldLabel>
                        <Input
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>

                  {/* -------------------------------- SUBMIT ------------------------------- */}
                  <Button
                    type="submit"
                    disabled={form.state.isSubmitting}
                    className="w-full"
                  >
                    {form.state.isSubmitting ? 'Posting...' : 'Post Credits'}
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
