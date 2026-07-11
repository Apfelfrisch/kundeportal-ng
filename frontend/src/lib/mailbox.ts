/**
 * Postfach-Helfer: Client-Validierung der Uploads (Regeln des Backends:
 * jpg/jpeg/png/pdf, max. 10 MB) und die deutschen Ticket-Labels der
 * Änderungsmeldungen (portiert aus den alten change-data-Karten).
 */

export const MAILBOX_MAX_FILE_SIZE = 10 * 1024 * 1024

export const MAILBOX_ACCEPT = '.jpg,.jpeg,.png,.pdf'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']

/** Prüft eine Datei; gibt eine deutsche Fehlermeldung oder `null` zurück. */
export function validateMailboxFile(file: {
  name: string
  size: number
  type: string
}): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const typeAllowed =
    ALLOWED_MIME_TYPES.includes(file.type) ||
    (file.type === '' && ALLOWED_EXTENSIONS.includes(extension))

  if (!typeAllowed) {
    return `„${file.name}“ konnte nicht angehängt werden. Die Datei muss vom Typ JPG, PNG oder PDF sein.`
  }

  if (file.size > MAILBOX_MAX_FILE_SIZE) {
    return `„${file.name}“ konnte nicht angehängt werden. Die Datei darf nicht größer als 10 MB sein.`
  }

  return null
}

export const MAILBOX_MESSAGE_MAX_LENGTH = 5000

/** Nachricht oder mindestens eine Datei ist erforderlich. */
export function validateMailboxMessage(
  message: string,
  fileCount: number,
): string | null {
  if (message.trim() === '' && fileCount === 0) {
    return 'Bitte eine Nachricht eingeben oder eine Datei anhängen.'
  }
  if (message.length > MAILBOX_MESSAGE_MAX_LENGTH) {
    return `Die Nachricht darf höchstens ${MAILBOX_MESSAGE_MAX_LENGTH} Zeichen lang sein.`
  }
  return null
}

/**
 * Deutsche Labels der Ticket-Typen, wie sie die alten
 * `change-data.cards.*`-Header anzeigten. Reine Chat-Nachrichten
 * (`contact`) erhalten kein Label.
 */
export const FORM_TYPE_LABELS: Record<string, string> = {
  bank: 'Bankverbindung',
  'billing-address': 'Rechnungsadresse',
  'delivery-address': 'Belieferungsadresse',
  'contact-data': 'Kontaktdaten',
  contractor: 'Vertragspartner',
  installment: 'Abschlag',
  'meter-count': 'Zählerstand',
  termination: 'Vertrag kündigen',
  revocation: 'Widerruf',
}

export function formTypeLabel(formType: string | null): string | null {
  if (formType === null || formType === 'contact') return null
  return FORM_TYPE_LABELS[formType] ?? formType
}
