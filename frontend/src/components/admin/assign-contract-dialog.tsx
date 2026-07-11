import { useState } from 'react'
import { toast } from 'sonner'

import { isApiError } from '#/api/client'
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
import { useAssignContract } from '#/queries/admin'

interface AssignContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fester Vertrag – der Dialog fragt nach der Benutzer-ID. */
  contractNumber?: number
  /** Fester Benutzer – der Dialog fragt nach der Vertragsnummer. */
  userId?: number
  userName?: string
}

/**
 * „Vertrag zuweisen“ (alte assign-contract-to-user-Modal): je nach Kontext
 * ist der Vertrag oder der Benutzer vorgegeben, der jeweils andere Teil
 * wird eingegeben. Erfolgreiche Zuordnung invalidiert Benutzer + Verträge.
 */
export function AssignContractDialog({
  open,
  onOpenChange,
  contractNumber,
  userId,
  userName,
}: AssignContractDialogProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const assignContract = useAssignContract()

  const asksForUser = contractNumber !== undefined

  function close(nextOpen: boolean) {
    if (!nextOpen) {
      setValue('')
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  async function submit() {
    const parsed = Number(value)
    if (value.trim() === '' || !Number.isInteger(parsed) || parsed <= 0) {
      setError(
        asksForUser
          ? 'Bitte eine gültige Benutzer-ID eingeben.'
          : 'Bitte eine gültige Vertragsnummer eingeben.',
      )
      return
    }

    try {
      const response = await assignContract.mutateAsync(
        asksForUser
          ? { user_id: parsed, contract_number: contractNumber }
          : { user_id: userId ?? 0, contract_number: parsed },
      )
      toast.success(response.message)
      close(false)
    } catch (submitError) {
      setError(
        isApiError(submitError)
          ? (Object.values(submitError.errors ?? {})[0]?.[0] ??
              submitError.message)
          : 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vertrag zuweisen</DialogTitle>
          <DialogDescription>
            {asksForUser
              ? `Vertrag ${contractNumber} einem Benutzer zuweisen. Der Benutzer erhält eine Bestätigungsmail.`
              : `Dem Benutzer ${userName ?? userId} einen Vertrag zuweisen. Der Benutzer erhält eine Bestätigungsmail.`}
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
            <Label htmlFor="assign-contract-value">
              {asksForUser ? 'Benutzer-ID (Stammnummer)' : 'Vertragsnummer'}
            </Label>
            <Input
              id="assign-contract-value"
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={assignContract.isPending}>
              {assignContract.isPending
                ? 'Wird zugewiesen…'
                : 'Vertrag zuweisen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
