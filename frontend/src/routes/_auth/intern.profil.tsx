import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'

import { GENERIC_ERROR_MESSAGE, isApiError } from '#/api/client'
import { ProfilePasswordCard } from '#/components/shared/profile-password-card'
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
  adminProfileQuery,
  useUpdateAdminEmail,
  useUpdateAdminPassword,
} from '#/queries/admin'

export const Route = createFileRoute('/_auth/intern/profil')({
  component: AdminProfilePage,
})

function AdminProfilePage() {
  const { data: profile, isPending } = useQuery(adminProfileQuery)
  const updatePassword = useUpdateAdminPassword()

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
              </dl>
            )}
          </CardContent>
        </Card>

        <EmailCard currentEmail={profile?.email} />
        <ProfilePasswordCard updatePassword={updatePassword.mutateAsync} />
      </div>
    </div>
  )
}

const emailSchema = z.object({
  email: z.email('Bitte gib eine gültige E-Mail-Adresse ein.'),
})

type EmailValues = z.infer<typeof emailSchema>

function EmailCard({ currentEmail }: { currentEmail: string | undefined }) {
  const updateEmail = useUpdateAdminEmail()

  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    values: { email: currentEmail ?? '' },
  })

  async function onSubmit(values: EmailValues) {
    try {
      const response = await updateEmail.mutateAsync(values)
      // Anders als im Kundenbereich bleibt der Admin-Bereich auch mit
      // unbestätigter E-Mail-Adresse nutzbar – kein Redirect nötig.
      toast.info(
        response.message ??
          'Deine E-Mail-Adresse wurde aktualisiert. Bitte bestätige die neue Adresse über den Link, den wir dir geschickt haben.',
        { duration: 10000 },
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
