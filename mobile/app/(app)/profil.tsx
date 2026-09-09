import { useRouter } from 'expo-router'
import { Lock, LogOut, Mail } from 'lucide-react-native'
import { Alert, StyleSheet, View } from 'react-native'

import { useProfile } from '@/api/queries'
import { Card } from '@/components/Card'
import { KeyValue } from '@/components/KeyValue'
import { ListRow } from '@/components/ListRow'
import { Screen } from '@/components/Screen'
import { Txt } from '@/components/Txt'
import { initials } from '@/lib/contracts'
import { useAuth, useUser } from '@/providers/AuthProvider'
import { useTheme } from '@/theme'

export default function ProfilScreen() {
  const user = useUser()
  const { logout } = useAuth()
  const router = useRouter()
  const theme = useTheme()
  const profile = useProfile(user.id)
  const data = profile.data ?? user

  function confirmLogout() {
    Alert.alert('Abmelden', 'Möchtest du dich auf diesem Gerät abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: () => void logout() },
    ])
  }

  return (
    <Screen refreshing={profile.isRefetching} onRefresh={() => void profile.refetch()}>
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Txt variant="heading" color={theme.accentFg} style={styles.avatarText}>
            {initials(data.name)}
          </Txt>
        </View>
        <Txt variant="heading">{data.name}</Txt>
        {data.customer_number ? <Txt variant="muted">Kundennummer {data.customer_number}</Txt> : null}
      </View>
      <Card gap={0} style={styles.kv}>
        <KeyValue label="E-Mail" value={data.email} />
        <KeyValue label="E-Mail bestätigt" value={data.email_verified ? 'Ja' : 'Nein'} last />
      </Card>
      <Card padding={0} gap={0}>
        <ListRow icon={Mail} label="E-Mail-Adresse ändern" onPress={() => router.push('/(app)/email-aendern')} />
        <ListRow icon={Lock} label="Passwort ändern" onPress={() => router.push('/(app)/passwort-aendern')} />
        <ListRow icon={LogOut} label="Abmelden" onPress={confirmLogout} danger last />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26 },
  kv: { paddingVertical: 4 },
})
