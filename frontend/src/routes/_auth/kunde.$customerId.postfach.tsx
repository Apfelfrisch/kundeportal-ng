import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Building2, Paperclip, User, X } from 'lucide-react'
import { toast } from 'sonner'

import { firstApiErrorMessage } from '#/api/client'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'
import {
  MAILBOX_ACCEPT,
  MAILBOX_MESSAGE_MAX_LENGTH,
  formTypeLabel,
  validateMailboxFile,
  validateMailboxMessage,
} from '#/lib/mailbox'
import { formatDate } from '#/lib/format'
import { mailboxQuery, useSendMailboxMessage } from '#/queries/mailbox'
import { tenantQuery } from '#/queries/tenant'
import type { MailboxEntry } from '#/types/api'

export const Route = createFileRoute('/_auth/kunde/$customerId/postfach')({
  component: MailboxPage,
})

function MailboxPage() {
  const { customerId } = Route.useParams()
  const { data: entries, isPending, isError } = useQuery(
    mailboxQuery(customerId),
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">Kundenchat</h1>

      <Composer customerId={customerId} />

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-2/3" />
          <Skeleton className="ml-auto h-24 w-2/3" />
          <Skeleton className="h-24 w-2/3" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground text-center text-sm">
          Das Postfach konnte nicht geladen werden. Bitte versuche es später
          erneut.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Noch keine Nachrichten. Schreib uns einfach – wir melden uns
          schnellstmöglich.
        </p>
      ) : (
        // Wie im Altsystem: neueste Nachricht oben.
        <div className="space-y-3">
          {entries.map((entry) => (
            <ChatMessage
              key={`${entry.direction}-${entry.id}`}
              entry={entry}
              customerId={customerId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ChatMessage({
  entry,
  customerId,
}: {
  entry: MailboxEntry
  customerId: string
}) {
  const { data: tenant } = useQuery(tenantQuery)
  const isCustomer = entry.direction === 'customer'
  const ticketLabel = isCustomer ? formTypeLabel(entry.form_type) : null
  const title = isCustomer ? ticketLabel : entry.subject

  return (
    <div
      className={cn(
        'max-w-[85%] sm:max-w-[75%]',
        isCustomer ? 'ml-auto' : 'mr-auto',
      )}
    >
      <div
        className={cn(
          'rounded-lg border px-4 py-3',
          isCustomer ? 'bg-primary/10' : 'bg-muted',
        )}
      >
        {title != null && title !== '' ? (
          <p className="mb-1 text-sm font-bold">{title}</p>
        ) : null}
        <p className="text-sm whitespace-pre-line">{entry.message}</p>
        {entry.files.length > 0 ? (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold">Anhänge:</p>
            <div className="flex flex-wrap gap-1">
              {entry.files.map((file) => (
                <a
                  key={file.id}
                  href={`/api/customers/${customerId}/postfach/files/${entry.direction}/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  <Paperclip className="size-3" />
                  {file.name}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <p
        className={cn(
          'text-muted-foreground mt-1 flex items-center gap-1 text-xs',
          isCustomer ? 'justify-end' : 'justify-start',
        )}
      >
        {isCustomer ? (
          <>
            <User className="size-3" aria-hidden="true" />
            Du
          </>
        ) : (
          <>
            <Building2 className="size-3" aria-hidden="true" />
            {tenant?.name.short ?? ''}
          </>
        )}
        {entry.created_at !== null ? ` | ${formatDate(entry.created_at)}` : null}
      </p>
    </div>
  )
}

function Composer({ customerId }: { customerId: string }) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<Array<File>>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMessage = useSendMailboxMessage(customerId)

  function addFiles(list: FileList | null) {
    if (list === null) return
    const accepted: Array<File> = []
    for (const file of Array.from(list)) {
      const fileError = validateMailboxFile(file)
      if (fileError !== null) {
        setError(fileError)
        continue
      }
      accepted.push(file)
    }
    if (accepted.length > 0) {
      setError(null)
      setFiles((current) => [...current, ...accepted])
    }
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = ''
    }
  }

  async function submit() {
    const validationError = validateMailboxMessage(message, files.length)
    if (validationError !== null) {
      setError(validationError)
      return
    }

    try {
      await sendMessage.mutateAsync({ message, files })
      setMessage('')
      setFiles([])
      setError(null)
      toast.success('Deine Nachricht wurde gesendet.')
    } catch (submitError) {
      setError(firstApiErrorMessage(submitError))
    }
  }

  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base">Nachricht an uns</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          {error !== null ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="mailbox-message">Nachricht</Label>
            <Textarea
              id="mailbox-message"
              rows={4}
              maxLength={MAILBOX_MESSAGE_MAX_LENGTH}
              placeholder="Schreib uns Deine Nachricht..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mailbox-files">Dateien hochladen (optional)</Label>
            <Input
              id="mailbox-files"
              ref={fileInputRef}
              type="file"
              multiple
              accept={MAILBOX_ACCEPT}
              onChange={(event) => addFiles(event.target.files)}
            />
            <p className="text-muted-foreground text-xs">
              Erlaubte Dateitypen: JPG, PNG, PDF (max. 10 MB pro Datei)
            </p>
          </div>
          {files.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {files.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="bg-background inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  <Paperclip className="size-3" />
                  {file.name}
                  <button
                    type="button"
                    aria-label={`${file.name} entfernen`}
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {/* Honeypot – bleibt für echte Nutzer unsichtbar und leer. */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor="mailbox-bot-check">Bitte leer lassen</label>
            <input
              id="mailbox-bot-check"
              type="text"
              name="bot-check"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>
          <Button type="submit" disabled={sendMessage.isPending}>
            {sendMessage.isPending ? 'Wird gesendet…' : 'Nachricht absenden'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
