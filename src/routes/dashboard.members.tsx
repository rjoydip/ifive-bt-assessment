import { createFileRoute } from '@tanstack/react-router'
import { MemberTable } from '~/components/team-table'
import data from './data.json'

export const Route = createFileRoute('/dashboard/members')({
  component: Members,
})

function Members() {
  return <MemberTable data={data} />
}
