import { Stack } from 'expo-router'

import { ContractProvider } from '@/providers/ContractProvider'
import { theme } from '@/theme'

/** Angemeldeter Bereich: Startseite ohne Kopfzeile, Unterseiten mit Zurück. */
export default function AppLayout() {
  return (
    <ContractProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.fg, fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="profil" options={{ title: 'Profil' }} />
        <Stack.Screen name="rechnungen" options={{ title: 'Rechnungen' }} />
        <Stack.Screen name="zaehlerstaende" options={{ title: 'Zählerstände' }} />
        <Stack.Screen name="zaehlerstand-melden" options={{ title: 'Zählerstand melden', presentation: 'modal' }} />
        <Stack.Screen name="zahlungen" options={{ title: 'Zahlungen' }} />
        <Stack.Screen name="abschlag-aendern" options={{ title: 'Abschlag anpassen', presentation: 'modal' }} />
        <Stack.Screen name="bankverbindung-aendern" options={{ title: 'Bankverbindung ändern', presentation: 'modal' }} />
        <Stack.Screen name="umzug-melden" options={{ title: 'Umzug melden', presentation: 'modal' }} />
        <Stack.Screen name="rechnungsadresse-aendern" options={{ title: 'Rechnungsadresse ändern', presentation: 'modal' }} />
        <Stack.Screen name="vertrag-kuendigen" options={{ title: 'Vertrag kündigen', presentation: 'modal' }} />
        <Stack.Screen name="vertragsdetails" options={{ title: 'Vertragsdetails' }} />
        <Stack.Screen name="tarifdetails" options={{ title: 'Tarifdetails' }} />
        <Stack.Screen name="vertrag-wechseln" options={{ title: 'Vertrag wechseln', presentation: 'modal' }} />
        <Stack.Screen name="email-aendern" options={{ title: 'E-Mail-Adresse ändern', presentation: 'modal' }} />
        <Stack.Screen name="passwort-aendern" options={{ title: 'Passwort ändern', presentation: 'modal' }} />
      </Stack>
    </ContractProvider>
  )
}
