import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

/**
 * Info-und-Aktions-Karte des Vertrags-Dashboards – Pendant zur alten
 * `x-info-and-action-cards.card`: Titel mit Icon, Info-Zeilen
 * (Kopf + Wert) und Aktions-Buttons im Footer.
 */
export function InfoCard({
  icon,
  title,
  titleExtra,
  children,
  footer,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  titleExtra?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {titleExtra}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">{children}</CardContent>
      {footer !== undefined ? (
        <CardFooter className="flex flex-col gap-2">{footer}</CardFooter>
      ) : null}
    </Card>
  )
}

/** Eine Info-Zeile: grauer Kopf + Wert (altes `info-head`/`info-body`). */
export function InfoRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="text-sm">{children ?? '–'}</div>
    </div>
  )
}
