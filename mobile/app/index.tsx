import { Redirect } from 'expo-router'

import { useAuth } from '@/providers/AuthProvider'

/** Einstieg: je nach Sitzung in den Kundenbereich oder zum Login. */
export default function Index() {
  const { state } = useAuth()
  return <Redirect href={state.status === 'authenticated' ? '/(app)' : '/login'} />
}
