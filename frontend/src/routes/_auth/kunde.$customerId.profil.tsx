import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'

import { isApiError } from '#/api/client'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { applyApiErrorsToForm } from '#/lib/forms'
import {
  profileQuery,
  useUpdateProfileEmail,
  useUpdateProfilePassword,
} from '#/queries/profile'

export const Route = createFileRoute('/_auth/kunde/$customerId/profil')({
  component: ProfilePage,
})

function ProfilePage() {
  const { customerId } = Route.useParams()
  const { data: profile, isPending } = useQuery(profileQuery(customerId))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Mein Profil</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kontoinformationen</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending || profile === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{profile.name}</dd>
                <dt className="text-muted-foreground">E-Mail</dt>
                <dd>{profile.email}</dd>
                {profile.customer_number !== null ? (
                  <>
                    <dt className="text-muted-foreground">Stammnummer</dt>
                    <dd>{profile.customer_number}</dd>
                  </>
                ) : null}
              </dl>
            )}
          </CardContent>
        </Card>

        <EmailCard customerId={customerId} currentEmail={profile?.email} />
        <PasswordCard customerId={customerId} />
      </div>
    </div>
  )
}

const emailSchema = z.object({
  email: z.email('Bitte gib eine gültige E-Mail-Adresse ein.'),
})

type EmailValues = z.infer<typeof emailSchema>

function EmailCard({
  customerId,
  currentEmail,
}: {
  customerId: string
  currentEmail: string | undefined
}) {
  const router = useRouter()
  const updateEmail = useUpdateProfileEmail(customerId)

  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    values: { email: currentEmail ?? '' },
  })

  async function onSubmit(values: EmailValues) {
    try {
      const response = await updateEmail.mutateAsync(values)
      // Backend setzt die Verifizierung zurück – Hinweis zeigen, DANN
      // invalidieren (der Auth-Guard leitet zur E-Mail-Verifizierung weiter).
      toast.info(
        response.message ??
          'Deine E-Mail-Adresse wurde aktualisiert. Bitte bestätige die neue Adresse über den Link, den wir dir geschickt haben.',
        { duration: 10000 },
      )
      await router.invalidate()
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, ['email'])
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
        <CardTitle className="text-base">E-Mail-Adresse ändern</CardTitle>
      </CardHeader>
      <CardContent>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Neue E-Mail-Adresse</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Wird gespeichert…'
                : 'E-Mail speichern'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Bitte gib dein aktuelles Passwort an.'),
    password: z
      .string()
      .min(12, 'Das Passwort muss aus mindestens 12 Zeichen bestehen.'),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['password_confirmation'],
  })

type PasswordValues = z.infer<typeof passwordSchema>

function PasswordCard({ customerId }: { customerId: string }) {
  const updatePassword = useUpdateProfilePassword(customerId)

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
      const response = await updatePassword.mutateAsync(values)
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
        <CardTitle className="text-base">Passwort ändern</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Das neue Passwort muss aus mindestens 12 Zeichen bestehen.
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
