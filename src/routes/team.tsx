import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

export const Route = createFileRoute('/team')({
  component: Users,
})

function Users() {
  return (
    <div>
      <h2>Lazy Component</h2>

      <p>
        Just a simple component that is lazy loaded. The lazy loaded chunk
        should only be loaded when this page is visited.
      </p>

      <div className="pt-5">
        <Suspense fallback={<div>Loading heavy component...</div>}></Suspense>
      </div>
    </div>
  )
}
