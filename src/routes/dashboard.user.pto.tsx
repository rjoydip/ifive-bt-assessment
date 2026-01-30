import { revalidateLogic, useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import { addDays, differenceInDays, startOfMonth } from 'date-fns'
import * as React from 'react'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Textarea } from '~/components/ui/textarea'
import { useSession } from '~/lib/auth/client'
import { cn } from '~/lib/utils'

/* -------------------------------------------------- */
/* Route */
/* -------------------------------------------------- */

export const Route = createFileRoute('/dashboard/user/pto')({
  component: PTORequest,
})

/* -------------------------------------------------- */
/* Schema */
/* -------------------------------------------------- */

export const ptoSchema = z.object({
  from: z.date(),
  to: z.date(),
  number_days: z.number().positive().optional().default(1),
  reason: z.string().max(250).optional(),
})

/* -------------------------------------------------- */
/* Component */
/* -------------------------------------------------- */

export function PTORequest({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { data } = useSession()
  const today = new Date()
  const tomorrow = addDays(today, 1)

  const form = useForm({
    defaultValues: {
      from: today,
      to: tomorrow,
      nnumber_days: 1,
      reason: '',
      created_by: data?.user.id,
    },
    validationLogic: revalidateLogic(),
    validators: {
      // @ts-expect-error (TanStack typing issue with zod schemas)
      onSubmit: ptoSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = {
        startDate: value.from,
        endDate: value.to,
        reason: value.reason,
        number_of_days: differenceInDays(addDays(value.to, 1), value.from),
      }

      console.log('PTO request:', payload)
    },
  })

  /* ---------------- month states ---------------- */

  const [fromMonth, setFromMonth] = React.useState(startOfMonth(today))
  const [toMonth, setToMonth] = React.useState(startOfMonth(tomorrow))

  /* -------------------------------------------------- */
  /* helpers */
  /* -------------------------------------------------- */

  const setFrom = (d: Date) => {
    form.setFieldValue('from', d)

    const currentTo = form.state.values.to

    // auto-fix invalid range
    if (d > currentTo) {
      form.setFieldValue('to', d)
    }

    setFromMonth(startOfMonth(d))
  }

  const setTo = (d: Date) => {
    const from = form.state.values.from

    if (d < from) return

    form.setFieldValue('to', d)
    setToMonth(startOfMonth(d))
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <Card className={cn('shadow-sm', className)} {...props}>
          <CardHeader>
            <CardTitle>Request PTO</CardTitle>
            <CardDescription>
              Select your leave dates and submit your request
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
                <div className="grid md:grid-cols-2 gap-6">
                  {/* ================= FROM ================= */}
                  <form.Field name="from">
                    {(field) => (
                      <Field>
                        <FieldLabel>From</FieldLabel>

                        <Card>
                          <Calendar
                            mode="single"
                            selected={field.state.value}
                            month={fromMonth}
                            onMonthChange={setFromMonth}
                            onSelect={(d) => d && setFrom(d)}
                            disabled={{ before: today }}
                            className="p-0 w-full"
                          />
                        </Card>
                      </Field>
                    )}
                  </form.Field>

                  {/* ================= TO ================= */}
                  <form.Field name="to">
                    {(field) => {
                      const from = form.state.values.from

                      return (
                        <Field>
                          <FieldLabel>To</FieldLabel>

                          <Card>
                            <Calendar
                              mode="single"
                              selected={field.state.value}
                              month={toMonth}
                              onMonthChange={setToMonth}
                              onSelect={(d) => d && setTo(d)}
                              disabled={{ before: from }}
                              className="p-0 w-full"
                            />
                          </Card>
                        </Field>
                      )
                    }}
                  </form.Field>
                </div>
                {/* ---------------- Reason ---------------- */}
                <form.Field name="reason">
                  {(field) => (
                    <Field>
                      <FieldLabel>Reason (optional)</FieldLabel>

                      <Textarea
                        rows={3}
                        placeholder="Add a note..."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                </form.Field>

                {/* ---------------- Submit ---------------- */}
                <Button
                  type="submit"
                  disabled={form.state.isSubmitting}
                  className="w-full"
                >
                  {form.state.isSubmitting ? 'Submitting...' : 'Request PTO'}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
