import { isApiError } from '#/api/client'

/** Fehlerzustand der Chart-Seiten (Loader-Fehler der Chart-Queries). */
export function ChartErrorState({ error }: { error: Error }) {
  const message =
    isApiError(error) && error.status === 404
      ? 'Diese Auswertung ist für deinen Zugang nicht verfügbar.'
      : 'Die Daten konnten nicht geladen werden. Bitte versuche es später erneut.'

  return (
    <div className="space-y-2 py-12 text-center">
      <h1 className="text-2xl font-semibold">Auswertung nicht verfügbar</h1>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
