import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { isApiError, post } from '#/api/client'
import { applyApiErrorsToForm } from '#/lib/forms'
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
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription } from '#/components/ui/alert'

const resetSearchSchema = z.object({
  token: z.string().catch(''),
  email: z.string().catch(''),
})

export const Route = createFileRoute('/_guest/passwort-zuruecksetzen')({
  validateSearch: resetSearchSchema,
  component: ResetPasswordPage,
})

const resetPasswordSchema = z
  .object({
    email: z.email('Bitte gib eine gültige E-Mail-Adresse ein.'),
    password: z
      .string()
      .min(12, 'Das Passwort muss aus mindestens 12 Zeichen bestehen.'),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['password_confirmation'],
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

function ResetPasswordPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: search.email,
      password: '',
      password_confirmation: '',
    },
  })

  if (search.token === '') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Neues Passwort speichern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              Der Link ist ungültig oder abgelaufen. Bitte fordere ein neues
              Passwort an.
            </AlertDescription>
          </Alert>
          <p className="text-sm">
            <Link
              to="/passwort-vergessen"
              className="text-primary underline-offset-4 hover:underline"
            >
              Neues Passwort anfordern
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  async function onSubmit(values: ResetPasswordValues) {
    try {
      await post('/api/auth/reset-password', {
        token: search.token,
        ...values,
      })
      toast.success('Dein neues Passwort wurde gespeichert.')
      await navigate({ to: '/login' })
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, [
          'email',
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Neues Passwort speichern</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-muted-foreground space-y-2 text-sm">
          <p>
            Bitte trage Deine E-Mail-Adresse und das gewünschte Passwort ein, um
            das neue Passwort zu speichern.
          </p>
          <p>
            Das neue Passwort muss aus mindestens <strong>12 Zeichen</strong>{' '}
            bestehen.
          </p>
        </div>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail-Adresse</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
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
              {form.formState.isSubmitting
                ? 'Wird gespeichert…'
                : 'Neues Passwort speichern'}
            </Button>
          </form>
        </Form>
        <p className="text-sm">
          <Link
            to="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Zurück zur Anmeldung
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
