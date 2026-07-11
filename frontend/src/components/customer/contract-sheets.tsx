import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  MailOpen,
} from 'lucide-react'

import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { contractFileDisplayName } from '#/lib/contracts'
import { formatDate, formatEuro, formatNumber } from '#/lib/format'
import type {
  ContractFile,
  ContractPayment,
  MeterCount,
} from '#/types/api'

/**
 * Die drei Listen-Sheets des Vertrags-Dashboards – Pendants zu den alten
 * Offcanvas-Fenstern: Anschreiben (Dokumente), Zählerstände, Zahlungsverkehr.
 */

export function ContractFilesSheet({
  files,
  fileUrl,
}: {
  files: Array<ContractFile>
  fileUrl: (fileId: ContractFile['id'], download: boolean) => string
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          title="Deine Anschreiben in einem Fenster anzeigen."
        >
          Anschreiben öffnen
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Deine Anschreiben</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 overflow-y-auto px-4 pb-6">
          {files.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              <MailOpen className="mx-auto size-8" />
              <p className="mt-3 font-medium">Noch keine Anschreiben</p>
              <p className="text-sm">
                Sobald wir dir ein Schreiben senden, findest du es hier.
              </p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="hover:bg-accent flex items-center gap-3 rounded-md border px-3 py-3"
              >
                <a
                  href={fileUrl(file.id, false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Öffnet das PDF in einem neuen Tab."
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <ExternalLink className="text-muted-foreground size-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {contractFileDisplayName(file.filename)}
                    </span>
                    {file.created_at !== null ? (
                      <span className="text-muted-foreground block text-xs">
                        erstellt am {formatDate(file.created_at)}
                      </span>
                    ) : null}
                  </span>
                </a>
                <a
                  href={fileUrl(file.id, true)}
                  title="PDF herunterladen"
                  aria-label={`${contractFileDisplayName(file.filename)} herunterladen`}
                  className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                >
                  <Download className="size-5" />
                </a>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function MeterCountsSheet({
  meterCounts,
  singleTariff,
}: {
  meterCounts: Array<MeterCount>
  singleTariff: boolean
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          title="Deine Zählerstände in einem Fenster anzeigen."
        >
          Zählerstände anzeigen
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Zählerstände</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {meterCounts.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Kein Zählerstand vorhanden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ablesedatum</TableHead>
                  {singleTariff ? (
                    <TableHead className="text-right">Zählerstand</TableHead>
                  ) : (
                    <>
                      <TableHead className="text-right">HT</TableHead>
                      <TableHead className="text-right">NT</TableHead>
                    </>
                  )}
                  <TableHead className="hidden md:table-cell">
                    Zählernummer
                  </TableHead>
                  <TableHead>Ableseart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meterCounts.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell className="font-medium">
                      {count.reading_date !== null
                        ? formatDate(count.reading_date)
                        : '–'}
                    </TableCell>
                    <TableCell className="text-right">
                      {count.meter_count_1 !== null
                        ? formatNumber(count.meter_count_1)
                        : '–'}
                    </TableCell>
                    {!singleTariff ? (
                      <TableCell className="text-right">
                        {count.meter_count_2 !== null
                          ? formatNumber(count.meter_count_2)
                          : '–'}
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden md:table-cell">
                      <code className="text-xs">{count.meter_number}</code>
                    </TableCell>
                    <TableCell>{count.reading_kind?.label ?? '–'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ContractPaymentsSheet({
  payments,
}: {
  payments: Array<ContractPayment>
}) {
  const bookedPayments = payments.filter(
    (payment) =>
      (payment.incoming_payment ?? 0) !== 0 ||
      (payment.outgoing_payment ?? 0) !== 0,
  )

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          title="Deinen Zahlungsverkehr in einem Fenster anzeigen."
        >
          Zahlungsverkehr anzeigen
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Zahlungsverkehr</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {bookedPayments.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Noch keine Zahlungen vorhanden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buchungsdatum</TableHead>
                  <TableHead className="text-right">Eingang</TableHead>
                  <TableHead className="text-right">Ausgang</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.booking_date !== null
                        ? formatDate(payment.booking_date)
                        : '–'}
                    </TableCell>
                    <TableCell className="text-right">
                      {(payment.incoming_payment ?? 0) !== 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <ArrowDown className="size-4 text-red-600" />
                          {formatEuro((payment.incoming_payment ?? 0) / 100)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {(payment.outgoing_payment ?? 0) !== 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <ArrowUp className="size-4 text-green-600" />
                          {formatEuro((payment.outgoing_payment ?? 0) / 100)}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
