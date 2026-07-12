import { useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'

import { firstApiErrorMessage } from '#/api/client'
import { UserPicker } from '#/components/admin/user-picker'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  MAILBOX_ACCEPT,
  MAILBOX_MESSAGE_MAX_LENGTH,
  validateMailboxFile,
} from '#/lib/mailbox'
import { useSendCompanyMessage } from '#/queries/admin'
import type { AdminUser } from '#/types/api'

interface SendMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * „Nachricht senden“ (alte write-company-message-Modal): Empfänger über die
 * Benutzersuche, Betreff, Nachricht und Anhänge wie im Kunden-Postfach
 * (JPG/PNG/PDF, max. 10 MB). Versand invalidiert den Postausgang.
 */
export function SendMessageDialog({ open, onOpenChange }: SendMessageDialogProps) {
  const [recipient, setRecipient] = useState<AdminUser | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<Array<File>>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMessage = useSendCompanyMessage()

  function close(nextOpen: boolean) {
    if (!nextOpen) {
      setRecipient(null)
      setSubject('')
      setMessage('')
      setFiles([])
      setError(null)
    }
    onOpenChange(nextOpen)
  }

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
    if (recipient === null) {
      setError('Bitte einen Empfänger auswählen.')
      return
    }
    if (subject.trim() === '') {
      setError('Bitte einen Betreff eingeben.')
      return
    }
    if (message.trim() === '') {
      setError('Bitte eine Nachricht eingeben.')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        customer_user_id: recipient.id,
        subject,
        message,
        files,
      })
      toast.success(response.message)
      close(false)
    } catch (submitError) {
      setError(firstApiErrorMessage(submitError))
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nachricht senden</DialogTitle>
          <DialogDescription>
            Sendet eine Nachricht in das Postfach des Kunden. Der Kunde wird
            per E-Mail benachrichtigt.
          </DialogDescription>
        </DialogHeader>
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
            <Label>Empfänger</Label>
            <UserPicker value={recipient} onSelect={setRecipient} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-message-subject">Betreff</Label>
            <Input
              id="company-message-subject"
              maxLength={255}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-message-body">Nachricht</Label>
            <Textarea
              id="company-message-body"
              rows={5}
              maxLength={MAILBOX_MESSAGE_MAX_LENGTH}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-message-files">
              Dateien hochladen (optional)
            </Label>
            <Input
              id="company-message-files"
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={sendMessage.isPending}>
              {sendMessage.isPending ? 'Wird gesendet…' : 'Nachricht absenden'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
