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

export const loginSchema = z.object({
  email: z.email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
})

export type LoginValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  login: (values: LoginValues) => Promise<void>
}

export function LoginForm({ login }: LoginFormProps) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    try {
      await login(values)
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, ['email', 'password'])
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail-Adresse</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" required {...field} />
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
                  autoComplete="current-password"
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
          {form.formState.isSubmitting ? 'Wird angemeldet…' : 'Anmelden'}
        </Button>
      </form>
    </Form>
  )
}
