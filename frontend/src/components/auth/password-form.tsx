import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { isApiError } from '#/api/client'
import { applyApiErrorsToForm } from '#/lib/forms'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription } from '#/components/ui/alert'

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(12, 'Das Passwort muss aus mindestens 12 Zeichen bestehen.'),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['password_confirmation'],
  })

export type PasswordValues = z.infer<typeof passwordSchema>

interface PasswordFormProps {
  submitLabel: string
  submit: (values: PasswordValues) => Promise<void>
}

/** Formular „Passwort + Passwort bestätigen“ (Account-Setup, Passwort setzen/zurücksetzen). */
export function PasswordForm({ submitLabel, submit }: PasswordFormProps) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', password_confirmation: '' },
  })

  async function onSubmit(values: PasswordValues) {
    try {
      await submit(values)
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, [
          'password',
          'password_confirmation',
        ])
      } else {
        form.setError('root', {
          message:
            'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
        })
      }
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="space-y-6"
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password_confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort bestätigen</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Wird gespeichert…' : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
