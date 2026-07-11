import type { ReactNode } from 'react'

/** Deutscher Leerzustand, wenn ein Chart-Fenster keine Daten enthält. */
export function ChartEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm">
      {children}
    </div>
  )
}
