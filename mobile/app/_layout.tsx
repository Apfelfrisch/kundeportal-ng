import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Loading } from '@/components/States'
import { Fill } from '@/components/Screen'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'
import { theme } from '@/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60 * 1000 },
  },
})

/** Login vs. angemeldeter Bereich – expo-router schützt die Gruppen. */
function RootNavigator() {
  const { state } = useAuth()

  if (state.status === 'loading') {
    return (
      <Fill>
        <Loading />
      </Fill>
    )
  }

  const authenticated = state.status === 'authenticated'

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        animation: 'fade',
      }}
    >
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
