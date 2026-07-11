import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { sessionQuery } from '#/queries/session'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)

    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }

    if (!session.password_set && location.pathname !== '/passwort-setzen') {
      throw redirect({ to: '/passwort-setzen' })
    }

    if (
      session.password_set &&
      !session.email_verified &&
      !session.admin &&
      location.pathname !== '/email-verifizieren'
    ) {
      throw redirect({ to: '/email-verifizieren' })
    }

    return { session }
  },
  component: () => <Outlet />,
})
