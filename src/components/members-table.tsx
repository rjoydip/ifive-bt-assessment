import { type UniqueIdentifier } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import {
  Ban,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ShieldBan,
  Trash,
  UserCheck,
  UserLock,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Tabs, TabsContent } from '~/components/ui/tabs'
import { admin, useSession } from '~/lib/auth/client'
import { Switch } from './ui/switch'

export const schema = z.object({
  id: z.string(),
  banExpires: z.string(),
  banReason: z.string(),
  banned: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
  createdAt: z.string(),
  email: z.email(),
  name: z.email(),
  total_leave: z.number().default(0),
  remaining_leave: z.number().default(0),
  image: z.string().nullable(),
  role: z.enum(['admin', 'user']).default('user'),
  updatedAt: z.string(),
})

type User = z.infer<typeof schema>

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: 'Email',
    header: 'Email',
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {row.original.email}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) =>
      row.original.role === 'user' ? <UserCheck /> : <UserLock />,
  },
  {
    accessorKey: 'banned',
    header: 'Banned',
    cell: ({ row }) =>
      row.original.banned ? (
        <Ban className="text-red-700 dark:bg-red-950 dark:text-red-300" />
      ) : (
        <ShieldBan className="text-green-700 dark:bg-green-950 dark:text-green-300" />
      ),
  },
  {
    accessorKey: 'total-leave',
    header: () => <div className="w-full text-right">Total Leave</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving ${row.original.total_leave}`,
            success: 'Done',
            error: 'Error',
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-total-leave`} className="sr-only">
          Total Leave
        </Label>
        <Input
          className="h-8 w-16 border bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background"
          defaultValue={row.original.total_leave ?? 0}
          id={`${row.original.id}-total-leave`}
        />
      </form>
    ),
  },
  {
    accessorKey: 'remaining-leave',
    header: () => <div className="w-full text-right">Remainig Leave</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving ${row.original.remaining_leave}`,
            success: 'Done',
            error: 'Error',
          })
        }}
      >
        <Label
          htmlFor={`${row.original.id}-remaining-leave`}
          className="sr-only"
        >
          Remainig Leave
        </Label>
        <Input
          className="h-8 w-16 border bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background"
          defaultValue={row.original.remaining_leave ?? 0}
          id={`${row.original.id}-remaining-leave`}
        />
      </form>
    ),
  },
  {
    id: 'promote',
    header: 'Promote',
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Switch
          id="prom"
          checked={row.original.role === 'admin'}
          onCheckedChange={async (value) => {
            row.toggleSelected(!!value)
            await admin.updateUser({
              userId: row.id,
              data: { role: row.original.role === 'admin' ? 'user' : 'admin' },
              fetchOptions: {
                onSuccess: () => {
                  toast.success(`${row.original.name} promoted to Admin`, {
                    position: 'top-center',
                    action: {
                      label: 'Undo',
                      onClick: () => {},
                    },
                  })
                },
              },
            })
          }}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    header: () => <div className="w-full text-right">Actions</div>,
    cell: ({ row }) => (
      <Button
        type="button"
        variant="outline"
        className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
        size="icon"
        onClick={async () => {
          await admin.removeUser({
            userId: row.id,
            fetchOptions: {
              onSuccess: () => {
                toast.success(`${row.original.name} deleted successfully`, {
                  position: 'top-center',
                  action: {
                    label: 'Undo',
                    onClick: () => {},
                  },
                })
              },
            },
          })
        }}
      >
        <Trash />
        <span className="sr-only">Delete</span>
      </Button>
    ),
  },
]

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

async function fetchUsers() {
  const response = await fetch(`/api/users?roles=admin&user`)
  const { data } = await response.json()
  return data
}

export function MembersTable() {
  const { data: currentUser } = useSession()
  const { data: getUsers = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })
  console.log(getUsers)
  const [data] = React.useState(() =>
    getUsers.filter(({ id }) => id !== currentUser?.user.id),
  )
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () =>
      data
        ?.filter(({ id }) => id !== currentUser?.user.id)
        .map(({ id }) => id) || [],
    [data],
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <Tabs
      defaultValue="outline"
      className="flex w-full flex-col justify-start gap-6"
    >
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {table.getRowModel().rows?.length ? (
                <SortableContext
                  items={dataIds}
                  strategy={verticalListSortingStrategy}
                >
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="past-performance"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  )
}

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {item.name}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>{item.name}</SheetTitle>
          <SheetDescription>
            Showing total visitors for the last 6 months
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={item.name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue={item.email} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="role">Rote</Label>
                <Input id="role" defaultValue={item.role} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="banned">Banned</Label>
                <Input id="banned" defaultValue={item.banned.toString()} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="verified">Verified</Label>
                <Input
                  id="verified"
                  defaultValue={item.emailVerified.toString()}
                />
              </div>
            </div>
          </form>
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full">Submit</Button>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Done
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
