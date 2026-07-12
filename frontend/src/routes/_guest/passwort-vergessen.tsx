import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { GENERIC_ERROR_MESSAGE, isApiError, post } from '#/api/client'
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

export const Route = createFileRoute('/_guest/passwort-vergessen')({
  component: ForgotPasswordPage,
})

const forgotPasswordSchema = z.object({
  email: z.email('Bitte gib eine gültige E-Mail-Adresse ein.'),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

function ForgotPasswordPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordValues) {
    try {
      const response = await post<{ message?: string }>(
        '/api/auth/forgot-password',
        values,
      )
      setSuccessMessage(
        response.message ??
          'Wir haben Dir eine E-Mail mit weiteren Instruktionen gesendet.',
      )
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, ['email'])
      } else {
        form.setError('root', { message: GENERIC_ERROR_MESSAGE })
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Neues Passwort anfordern</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-muted-foreground space-y-2 text-sm">
          <p>
            Bitte gib Deine E-Mail-Adresse ein, um ein neues Passwort
            anzufordern.
          </p>
          <p>
            Wir schicken Dir anschließend eine E-Mail mit weiteren
            Instruktionen.
          </p>
        </div>
        {successMessage !== null ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : (
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
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? 'Wird gesendet…'
                  : 'Neues Passwort anfordern'}
              </Button>
            </form>
          </Form>
        )}
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
