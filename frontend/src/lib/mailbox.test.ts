import { describe, expect, it } from 'vitest'

import {
  MAILBOX_MAX_FILE_SIZE,
  MAILBOX_MESSAGE_MAX_LENGTH,
  formTypeLabel,
  validateMailboxFile,
  validateMailboxMessage,
} from '#/lib/mailbox'

describe('validateMailboxFile', () => {
  it('akzeptiert JPG, PNG und PDF bis 10 MB', () => {
    expect(
      validateMailboxFile({ name: 'foto.jpg', size: 1024, type: 'image/jpeg' }),
    ).toBeNull()
    expect(
      validateMailboxFile({ name: 'scan.png', size: 1024, type: 'image/png' }),
    ).toBeNull()
    expect(
      validateMailboxFile({
        name: 'rechnung.pdf',
        size: MAILBOX_MAX_FILE_SIZE,
        type: 'application/pdf',
      }),
    ).toBeNull()
  })

  it('lehnt andere Dateitypen ab', () => {
    expect(
      validateMailboxFile({ name: 'virus.exe', size: 10, type: 'application/x-msdownload' }),
    ).toContain('JPG, PNG oder PDF')
    expect(
      validateMailboxFile({ name: 'notiz.txt', size: 10, type: 'text/plain' }),
    ).toContain('JPG, PNG oder PDF')
  })

  it('lehnt Dateien über 10 MB ab', () => {
    expect(
      validateMailboxFile({
        name: 'gross.pdf',
        size: MAILBOX_MAX_FILE_SIZE + 1,
        type: 'application/pdf',
      }),
    ).toContain('10 MB')
  })

  it('fällt bei fehlendem MIME-Type auf die Dateiendung zurück', () => {
    expect(
      validateMailboxFile({ name: 'scan.PDF', size: 10, type: '' }),
    ).toBeNull()
  })
})

describe('validateMailboxMessage', () => {
  it('verlangt Nachricht oder Datei', () => {
    expect(validateMailboxMessage('', 0)).toContain('Nachricht')
    expect(validateMailboxMessage('   ', 0)).toContain('Nachricht')
  })

  it('akzeptiert eine Datei ohne Nachricht', () => {
    expect(validateMailboxMessage('', 1)).toBeNull()
  })

  it('akzeptiert eine Nachricht ohne Datei', () => {
    expect(validateMailboxMessage('Hallo', 0)).toBeNull()
  })

  it('begrenzt die Nachricht auf 5000 Zeichen', () => {
    expect(
      validateMailboxMessage('x'.repeat(MAILBOX_MESSAGE_MAX_LENGTH), 0),
    ).toBeNull()
    expect(
      validateMailboxMessage('x'.repeat(MAILBOX_MESSAGE_MAX_LENGTH + 1), 0),
    ).toContain('5000')
  })
})

describe('formTypeLabel', () => {
  it('übersetzt die Ticket-Typen ins Deutsche', () => {
    expect(formTypeLabel('bank')).toBe('Bankverbindung')
    expect(formTypeLabel('meter-count')).toBe('Zählerstand')
    expect(formTypeLabel('termination')).toBe('Vertrag kündigen')
    expect(formTypeLabel('delivery-address')).toBe('Belieferungsadresse')
  })

  it('liefert für Chat-Nachrichten kein Label', () => {
    expect(formTypeLabel('contact')).toBeNull()
    expect(formTypeLabel(null)).toBeNull()
  })
})
