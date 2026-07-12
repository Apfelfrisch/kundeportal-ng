import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'

import { GENERIC_ERROR_MESSAGE, isApiError } from '#/api/client'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { Input } from '#/components/ui/input'
import { applyApiErrorsToForm } from '#/lib/forms'
import { useCreateUser } from '#/queries/admin'

const createUserSchema = z.object({
  name: z.string().min(1, 'Bitte einen Namen eingeben.'),
  email: z.email('Bitte eine gültige E-Mail-Adresse eingeben.'),
  contract_number: z
    .string()
    .regex(/^\d*$/, 'Bitte eine gültige Vertragsnummer eingeben.'),
  send_mail: z.boolean(),
})

type CreateUserValues = z.infer<typeof createUserSchema>

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * „Benutzer anlegen“ (alte create-customer-user-Modal): Name, E-Mail,
 * optionale Vertragsnummer (legt direkt eine Zuordnung an) und die
 * Einladungs-Mail-Option des alten CustomerUserController.
 */
export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateUser()

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      contract_number: '',
      send_mail: true,
    },
  })

  function close(nextOpen: boolean) {
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: CreateUserValues) {
    try {
      const response = await createUser.mutateAsync({
        name: values.name,
        email: values.email,
        contract_number:
          values.contract_number === ''
            ? undefined
            : Number(values.contract_number),
        send_mail: values.send_mail,
      })
      toast.success(response.message)
      close(false)
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, [
          'name',
          'email',
          'contract_number',
          'send_mail',
        ])
      } else {
        form.setError('root', { message: GENERIC_ERROR_MESSAGE })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Benutzer anlegen</DialogTitle>
          <DialogDescription>
            Legt einen neuen Kunden-Benutzer an. Mit Vertragsnummer wird der
            Vertrag direkt zugeordnet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="space-y-4"
            noValidate
          >
            {form.formState.errors.root ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voller Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail-Adresse</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contract_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vertragsnummer (optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="send_mail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Einladungs-Mail senden
                  </FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => close(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Wird angelegt…'
                  : 'Kunden anlegen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
