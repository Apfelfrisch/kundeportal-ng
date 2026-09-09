import * as SecureStore from 'expo-secure-store'

/** Gerätespeicher: Bearer-Token und zuletzt gewählter Vertrag. */

const TOKEN_KEY = 'auth_token'
const CONTRACT_KEY = 'contract_number'

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

async function write(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key)
    else await SecureStore.setItemAsync(key, value)
  } catch {
    // Ohne sicheren Speicher (z. B. Web) bleibt die Sitzung flüchtig.
  }
}

export const tokenStorage = {
  load: () => read(TOKEN_KEY),
  save: (token: string | null) => write(TOKEN_KEY, token),
}

export const contractStorage = {
  load: async (): Promise<number | null> => {
    const value = await read(CONTRACT_KEY)
    const number = value === null ? Number.NaN : Number(value)
    return Number.isInteger(number) ? number : null
  },
  save: (contractNumber: number | null) =>
    write(CONTRACT_KEY, contractNumber === null ? null : String(contractNumber)),
}
