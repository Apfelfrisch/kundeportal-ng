import { describe, expect, it } from 'vitest'

import {
  buildAdminQuery,
  formatTicketDataValue,
  ticketDataEntries,
  ticketDataLabel,
  ticketStatusLabel,
  ticketStatusTransitions,
  ticketTypeLabel,
} from '#/lib/admin'

describe('buildAdminQuery', () => {
  it('baut einen Query-String aus den Filtern', () => {
    expect(buildAdminQuery({ page: 2, name: 'Muster' })).toBe(
      '?page=2&name=Muster',
    )
  })

  it('lässt leere und fehlende Werte weg', () => {
    expect(
      buildAdminQuery({
        page: undefined,
        name: '',
        email: null,
        user_filter: 'with_user',
      }),
    ).toBe('?user_filter=with_user')
  })

  it('liefert einen leeren String ohne Filter', () => {
    expect(buildAdminQuery({})).toBe('')
    expect(buildAdminQuery({ name: undefined })).toBe('')
  })

  it('kodiert Sonderzeichen', () => {
    expect(buildAdminQuery({ email: 'a+b@example.com' })).toBe(
      '?email=a%2Bb%40example.com',
    )
  })
})

describe('ticketStatusLabel', () => {
  it('übersetzt die Status ins Deutsche', () => {
    expect(ticketStatusLabel('open')).toBe('Offen')
    expect(ticketStatusLabel('in_process')).toBe('In Arbeit')
    expect(ticketStatusLabel('processed')).toBe('Erledigt')
  })
})

describe('ticketStatusTransitions', () => {
  it('bietet für offene Tickets „In Arbeit nehmen“ und „Erledigt“ an', () => {
    expect(ticketStatusTransitions('open')).toEqual([
      { status: 'in_process', label: 'In Arbeit nehmen' },
      { status: 'processed', label: 'Erledigt' },
    ])
  })

  it('bietet für Tickets in Arbeit „Erledigt“ und „Wieder öffnen“ an', () => {
    expect(ticketStatusTransitions('in_process')).toEqual([
      { status: 'processed', label: 'Erledigt' },
      { status: 'open', label: 'Wieder öffnen' },
    ])
  })

  it('bietet für erledigte Tickets „In Arbeit nehmen“ und „Wieder öffnen“ an', () => {
    expect(ticketStatusTransitions('processed')).toEqual([
      { status: 'in_process', label: 'In Arbeit nehmen' },
      { status: 'open', label: 'Wieder öffnen' },
    ])
  })
})

describe('ticketTypeLabel', () => {
  it('übersetzt Formular-Typen ins Deutsche', () => {
    expect(ticketTypeLabel('bank')).toBe('Bankverbindung')
    expect(ticketTypeLabel('meter-count')).toBe('Zählerstand')
    expect(ticketTypeLabel('termination')).toBe('Vertrag kündigen')
  })

  it('nennt Chat-Nachrichten „Nachricht“', () => {
    expect(ticketTypeLabel('contact')).toBe('Nachricht')
    expect(ticketTypeLabel(null)).toBe('Nachricht')
  })

  it('reicht unbekannte Typen durch', () => {
    expect(ticketTypeLabel('unbekannt')).toBe('unbekannt')
  })
})

describe('ticketDataLabel', () => {
  it('übersetzt die data-Schlüssel ins Deutsche', () => {
    expect(ticketDataLabel('iban')).toBe('IBAN')
    expect(ticketDataLabel('bank_account_owner')).toBe('Name')
    expect(ticketDataLabel('change_all_contracts')).toBe(
      'Für alle Verträge übernehmen',
    )
    expect(ticketDataLabel('reason_of_termination')).toBe('Kündigungsgrund')
  })

  it('reicht unbekannte Schlüssel durch', () => {
    expect(ticketDataLabel('custom_key')).toBe('custom_key')
  })
})

describe('formatTicketDataValue', () => {
  it('formatiert Booleans als Ja/Nein', () => {
    expect(formatTicketDataValue('sepa', true)).toBe('Ja')
    expect(formatTicketDataValue('sepa', false)).toBe('Nein')
  })

  it('formatiert Datumsfelder deutsch', () => {
    expect(formatTicketDataValue('read_on', '2026-01-15')).toBe('15.01.2026')
    expect(formatTicketDataValue('termination_at', '2026-12-31')).toBe(
      '31.12.2026',
    )
  })

  it('formatiert den Abschlag als Euro-Betrag', () => {
    // Intl trennt Betrag und €-Zeichen mit einem geschützten Leerzeichen.
    const NBSP = ' '
    expect(formatTicketDataValue('installment', 120)).toBe(`120,00${NBSP}€`)
    expect(formatTicketDataValue('installment', '85.5')).toBe(`85,50${NBSP}€`)
  })

  it('formatiert Zählerstände mit kWh', () => {
    expect(formatTicketDataValue('meter_count', 12345.6)).toBe('12.345,6 kWh')
  })

  it('reicht sonstige Werte als String durch', () => {
    expect(formatTicketDataValue('iban', 'DE69284500000021025564')).toBe(
      'DE69284500000021025564',
    )
  })
})

describe('ticketDataEntries', () => {
  it('lässt leere Werte weg und formatiert den Rest', () => {
    expect(
      ticketDataEntries({
        iban: 'DE69284500000021025564',
        bank: null,
        sepa: true,
        city: '',
      }),
    ).toEqual([
      { key: 'iban', label: 'IBAN', value: 'DE69284500000021025564' },
      { key: 'sepa', label: 'Sepa-Mandat erteilt', value: 'Ja' },
    ])
  })
})
