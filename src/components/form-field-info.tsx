import type { AnyFieldApi } from '@tanstack/react-form'

export function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid
        ? field.state.meta.errors.map((err, index) => (
            <em key={index} className="text-sm text-red-500">
              {err.message}
            </em>
          ))
        : null}
      {field.state.meta.isValidating ? 'Validating...' : null}
    </>
  )
}
