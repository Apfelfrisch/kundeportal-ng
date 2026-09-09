/** IBAN-Prüfung nach ISO 7064 (Mod 97-10), Leerzeichen erlaubt. */
export function isValidIban(value: string): boolean {
  const compact = value.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(compact)) return false
  const rearranged = compact.slice(4) + compact.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

/** Eingabe in Vierergruppen formatieren, während getippt wird. */
export function groupIban(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim()
}
