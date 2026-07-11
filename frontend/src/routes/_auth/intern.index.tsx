import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_auth/intern/')({
  component: AdminIndexPage,
})

function AdminIndexPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">Übersicht wird geladen…</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
