import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { QuarterHourChart } from './quarter-hour-chart'
import { CHART_COLORS, buildQuarterHourSeries } from '#/lib/charts'

// Recharts' ResponsiveContainer misst über ResizeObserver – jsdom hat keinen
// und liefert 0×0. Der Stub meldet sofort eine feste Größe, damit das
// Diagramm tatsächlich rendert.
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly callback: ResizeObserverCallback

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }

      observe(target: Element) {
        const contentRect = {
          width: 800,
          height: 400,
          top: 0,
          left: 0,
          bottom: 400,
          right: 800,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
        this.callback(
          [{ target, contentRect } as unknown as ResizeObserverEntry],
          this,
        )
      }

      unobserve() {}
      disconnect() {}
    },
  )
})

const data = buildQuarterHourSeries({
  from: '2025-06-09',
  until: '2025-06-11',
  entries: [
    { starts_at: '2025-06-10T00:00:00', price: 8.213, total: 30 },
    { starts_at: '2025-06-10T00:15:00', price: 7.951, total: 29 },
  ],
  getStart: (entry) => entry.starts_at,
  getValues: (entry) => ({ price: entry.price, total: entry.total }),
  keys: ['price', 'total'],
})

describe('QuarterHourChart', () => {
  it('renders a single series without a legend', () => {
    render(
      <QuarterHourChart
        data={data}
        from="2025-06-09"
        until="2025-06-11"
        unit="ct/kWh"
        ariaLabel="Stufendiagramm der Börsenpreise"
        series={[
          {
            key: 'price',
            label: 'Börsenpreis (ct/kWh)',
            color: CHART_COLORS.blue,
            kind: 'area',
            formatValue: (value) => String(value),
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Stufendiagramm der Börsenpreise' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Börsenpreis (ct/kWh)')).not.toBeInTheDocument()
  })

  it('renders a legend for two series', () => {
    render(
      <QuarterHourChart
        data={data}
        from="2025-06-09"
        until="2025-06-11"
        unit="ct/kWh"
        ariaLabel="Stufendiagramm der Preise"
        series={[
          {
            key: 'price',
            label: 'Börsenpreis (ct/kWh)',
            color: CHART_COLORS.aqua,
            kind: 'line',
            formatValue: (value) => String(value),
          },
          {
            key: 'total',
            label: 'Gesamtpreis (ct/kWh)',
            color: CHART_COLORS.yellow,
            kind: 'line',
            formatValue: (value) => String(value),
          },
        ]}
      />,
    )

    expect(screen.getByText('Börsenpreis (ct/kWh)')).toBeInTheDocument()
    expect(screen.getByText('Gesamtpreis (ct/kWh)')).toBeInTheDocument()
  })
})
