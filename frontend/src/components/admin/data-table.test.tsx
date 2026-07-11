import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DataTable } from './data-table'
import { ServerPagination } from './server-pagination'
import type { DataTableColumn } from './data-table'

interface Row {
  id: number
  name: string
}

const columns: Array<DataTableColumn<Row>> = [
  { key: 'id', header: 'ID', cell: (row) => row.id },
  { key: 'name', header: 'Name', cell: (row) => row.name },
]

describe('DataTable', () => {
  it('rendert Zeilen mit den konfigurierten Spalten', () => {
    render(
      <DataTable
        columns={columns}
        rows={[
          { id: 1, name: 'Erika Musterfrau' },
          { id: 2, name: 'Max Mustermann' },
        ]}
        rowKey={(row) => row.id}
        isPending={false}
        emptyMessage="Keine Einträge."
      />,
    )

    expect(screen.getByText('Erika Musterfrau')).toBeInTheDocument()
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    expect(screen.queryByText('Keine Einträge.')).not.toBeInTheDocument()
  })

  it('zeigt den deutschen Leer-Zustand', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        isPending={false}
        emptyMessage="Keine Einträge."
      />,
    )

    expect(screen.getByText('Keine Einträge.')).toBeInTheDocument()
  })
})

describe('ServerPagination', () => {
  it('zeigt Seite und Gesamtanzahl und blättert weiter', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()

    render(
      <ServerPagination
        meta={{ current_page: 2, last_page: 3, total: 55 }}
        onPageChange={onPageChange}
        itemLabel={['Vertrag', 'Verträge']}
      />,
    )

    expect(screen.getByText('Seite 2 von 3 · 55 Verträge')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('deaktiviert „Zurück“ auf der ersten Seite', () => {
    render(
      <ServerPagination
        meta={{ current_page: 1, last_page: 3, total: 55 }}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Zurück' })).toBeDisabled()
  })
})
