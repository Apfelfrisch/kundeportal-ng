import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_auth/kunde/$customerId/')({
  component: CustomerIndexPage,
})

function CustomerIndexPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verträge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Verträge werden geladen…
        </p>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}
