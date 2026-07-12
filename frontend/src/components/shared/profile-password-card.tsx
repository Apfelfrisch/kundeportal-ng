import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'

import { GENERIC_ERROR_MESSAGE, isApiError } from '#/api/client'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { Input } from '#/components/ui/input'
import {
  PASSWORD_MIN_LENGTH,
  applyApiErrorsToForm,
  newPasswordSchema,
  passwordsMatch,
  passwordsMatchParams,
} from '#/lib/forms'
import type { ProfileResponse } from '#/types/api'

const passwordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, 'Bitte gib dein aktuelles Passwort an.'),
    password: newPasswordSchema,
    password_confirmation: z.string(),
  })
  .refine(passwordsMatch, passwordsMatchParams)

type PasswordValues = z.infer<typeof passwordSchema>

interface ProfilePasswordCardProps {
  /** Speichert das neue Passwort (Kunden- bzw. Admin-Endpunkt). */
  updatePassword: (values: PasswordValues) => Promise<ProfileResponse>
}

/** Karte „Passwort ändern“ der Profilseiten (Kundenbereich und Admin). */
export function ProfilePasswordCard({
  updatePassword,
}: ProfilePasswordCardProps) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  async function onSubmit(values: PasswordValues) {
    try {
      const response = await updatePassword(values)
      toast.success(response.message ?? 'Dein Passwort wurde aktualisiert.')
      form.reset()
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, [
          'current_password',
          'password',
          'password_confirmation',
        ])
      } else {
        form.setError('root', { message: GENERIC_ERROR_MESSAGE })
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Passwort ändern</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Das neue Passwort muss aus mindestens {PASSWORD_MIN_LENGTH} Zeichen
          bestehen.
        </p>
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
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aktuelles Passwort</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Neues Passwort</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
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
                  <FormLabel>Neues Passwort bestätigen</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Wird gespeichert…'
                : 'Passwort speichern'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
