import { createFileRoute, redirect } from '@tanstack/react-router'

import { sessionQuery } from '#/queries/session'

/**
 * Dispatcher: leitet je nach Rolle weiter.
 * Admins → /intern, Kunden → /kunde/{id}, Gäste → /login.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)

    if (!session) {
      throw redirect({ to: '/login' })
    }

    if (session.admin) {
      throw redirect({ to: '/intern' })
    }

    throw redirect({
      to: '/kunde/$customerId',
      params: { customerId: String(session.id) },
    })
  },
  component: () => null,
})
