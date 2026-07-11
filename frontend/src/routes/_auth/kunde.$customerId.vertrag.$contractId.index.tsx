import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
  Banknote,
  FileText,
  Gauge,
  HelpCircle,
  House,
  Phone,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'

import {
  ContractFilesSheet,
  ContractPaymentsSheet,
  MeterCountsSheet,
} from '#/components/customer/contract-sheets'
import { InfoCard, InfoRow } from '#/components/customer/info-card'
import { ContractStatusBadge } from '#/components/customer/status-badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Table, TableBody, TableCell, TableRow } from '#/components/ui/table'
import {
  isRevocable,
  isSingleTariffMeter,
  latestMeterCount,
  primaryMeter,
  primaryMeterPoint,
} from '#/lib/contracts'
import {
  formatCt,
  formatDate,
  formatEuro,
  formatIban,
  formatNumber,
} from '#/lib/format'
import { contractQuery } from '#/queries/contracts'
import { tenantQuery } from '#/queries/tenant'
import type { Contract } from '#/types/api'

export const Route = createFileRoute(
  '/_auth/kunde/$customerId/vertrag/$contractId/',
)({
  component: ContractDashboardPage,
})

function ContractDashboardPage() {
  const { customerId, contractId } = Route.useParams()
  const { data: contract } = useSuspenseQuery(
    contractQuery(customerId, contractId),
  )

  const meterPoint = primaryMeterPoint(contract)
  const singleTariff = isSingleTariffMeter(contract)

  const fileUrl = (fileId: number | string, download: boolean) =>
    `/api/customers/${customerId}/contracts/${contractId}/files/${fileId}${download ? '?download=1' : ''}`

  return (
    <div className="space-y-6">
      {contract.sales_partner !== null ? (
        <div className="bg-muted rounded-md border px-4 py-2 text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Empfohlen durch unseren Partner
          </p>
          <p className="font-semibold">{contract.sales_partner}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            Vertrag {contract.contract_number}
          </h1>
          <ContractStatusBadge status={contract.status} />
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Schnellaktionen"
        >
          <ContractFilesSheet files={contract.files} fileUrl={fileUrl} />
          {!contract.is_dynamic ? (
            <MeterCountsSheet
              meterCounts={meterPoint?.meter_counts ?? []}
              singleTariff={singleTariff}
            />
          ) : null}
          <ContractPaymentsSheet payments={contract.payments} />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contract.is_dynamic ? (
          <DynamicPriceCard contract={contract} />
        ) : (
          <InstallmentCard
            contract={contract}
            customerId={customerId}
            contractId={contractId}
          />
        )}
        {contract.is_dynamic ? (
          <DynamicUsageCard customerId={customerId} contractId={contractId} />
        ) : (
          <UsageCard
            contract={contract}
            customerId={customerId}
            contractId={contractId}
          />
        )}
        <DeliveryAddressCard
          contract={contract}
          customerId={customerId}
          contractId={contractId}
        />
        <BankCard
          contract={contract}
          customerId={customerId}
          contractId={contractId}
        />
        <ContactCard
          contract={contract}
          customerId={customerId}
          contractId={contractId}
        />
        <ContractDataCard
          contract={contract}
          customerId={customerId}
          contractId={contractId}
        />
      </section>
    </div>
  )
}

interface CardProps {
  contract: Contract
  customerId: string
  contractId: string
}

function ChangeLink({
  customerId,
  contractId,
  formType,
  title,
  children,
}: {
  customerId: string
  contractId: string
  formType: string
  title: string
  children: ReactNode
}) {
  return (
    <Button asChild className="w-full">
      <Link
        to="/kunde/$customerId/vertrag/$contractId/aendern/$formType"
        params={{ customerId, contractId, formType }}
        title={title}
      >
        {children}
      </Link>
    </Button>
  )
}

/** Abschlag/Tarif-Karte des klassischen Tarifs (Bruttopreise). */
function InstallmentCard({ contract, customerId, contractId }: CardProps) {
  const installment = contract.installment

  return (
    <InfoCard
      icon={<Zap className="size-4" />}
      title={`Tarif: ${contract.tariff ?? ''}`}
      footer={
        <ChangeLink
          customerId={customerId}
          contractId={contractId}
          formType="installment"
          title="Ändere hier deinen Abschlag"
        >
          Abschlag ändern
        </ChangeLink>
      }
    >
      <InfoRow label="Abschlag:">
        {installment?.amount_cents != null ? (
          <span className="text-2xl font-bold">
            {formatEuro(installment.amount_cents / 100)} pro Monat
          </span>
        ) : (
          '–'
        )}
      </InfoRow>
      {installment?.next_payment != null ? (
        <InfoRow label="Nächste Zahlung:">
          {formatDate(installment.next_payment)}
        </InfoRow>
      ) : null}
      <InfoRow label="Arbeitspreis:*">
        {contract.prices.working_price_ct_gross !== null
          ? `${formatCt(contract.prices.working_price_ct_gross)} pro kWh`
          : '–'}
      </InfoRow>
      <InfoRow label="Grundpreis:*">
        {contract.prices.base_price_eur_gross !== null
          ? `${formatEuro(contract.prices.base_price_eur_gross)} pro Monat`
          : '–'}
      </InfoRow>
      <InfoRow label="Ende Preisgarantie:">
        {contract.price_guarantee !== null
          ? formatDate(contract.price_guarantee)
          : '–'}
      </InfoRow>
      <p className="text-muted-foreground text-xs">
        *Bruttopreise inkl. Mehrwertsteuer.
      </p>
    </InfoCard>
  )
}

/** Preis/Tarif-Karte des dynamischen Tarifs (Nettopreise + Komponenten). */
function DynamicPriceCard({ contract }: { contract: Contract }) {
  const prices = contract.prices
  const workingComponents = Object.entries(prices.working_price_components)
  const baseComponents = Object.entries(prices.base_price_components)

  return (
    <InfoCard
      icon={<Zap className="size-4" />}
      title={`Tarif: ${contract.tariff ?? ''}`}
      titleExtra={<DynamicPriceHelpDialog contract={contract} />}
    >
      <InfoRow label="Arbeitspreis:*">
        {prices.calculated_dynamic_working_price_ct !== null ? (
          <span className="text-2xl font-bold">
            {formatCt(prices.calculated_dynamic_working_price_ct)} / kWh
          </span>
        ) : (
          '–'
        )}
      </InfoRow>
      <p className="bg-primary text-primary-foreground inline-block rounded px-2 py-1 text-sm font-bold">
        + Beschaffungskosten (Börse)
      </p>
      <InfoRow label="Grundpreis:*">
        {prices.base_price_eur !== null ? (
          <span className="text-2xl font-bold">
            {formatEuro(prices.base_price_eur)} / Monat
          </span>
        ) : (
          '–'
        )}
      </InfoRow>

      {workingComponents.length > 0 || baseComponents.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-muted-foreground text-xs font-medium">
            Preisaufschlüsselung:
          </p>
          {workingComponents.length > 0 ? (
            <PriceComponentTable
              title="Arbeitspreis"
              rows={workingComponents}
              format={(amount) => `${formatCt(amount)} / kWh`}
            />
          ) : null}
          {baseComponents.length > 0 ? (
            <PriceComponentTable
              title="Grundpreis"
              rows={baseComponents}
              format={(amount) => `${formatEuro(amount)} / Jahr`}
            />
          ) : null}
        </div>
      ) : null}
      <p className="text-muted-foreground text-xs">
        *Nettopreise zzgl. Mehrwertsteuer.
      </p>
    </InfoCard>
  )
}

function PriceComponentTable({
  title,
  rows,
  format,
}: {
  title: string
  rows: Array<[string, number]>
  format: (amount: number) => string
}) {
  return (
    <details>
      <summary className="cursor-pointer text-sm select-none">{title}</summary>
      <Table>
        <TableBody>
          {rows.map(([label, amount]) => (
            <TableRow key={label}>
              <TableCell className="text-muted-foreground px-0 py-1 text-xs">
                {label}
              </TableCell>
              <TableCell className="text-muted-foreground px-0 py-1 text-right text-xs">
                {format(amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </details>
  )
}

/** Hilfe-Dialog der Tarifpreise, portiert aus dem alten Help-Modal. */
function DynamicPriceHelpDialog({ contract }: { contract: Contract }) {
  const { data: tenant } = useQuery(tenantQuery)
  const companyName = tenant?.name.short ?? 'uns'

  const glossary: Array<[string, string]> = [
    [
      `Arbeitspreis ${companyName}`,
      'Der von uns erhobene Aufschlag, hiermit finanzieren wir alle unsere Kosten.',
    ],
    [
      'Arbeitspreis Netzbetreiber',
      'Netznutzungsentgelt je verbrauchter Kilowattstunde.',
    ],
    [
      'Konzessionsabgabe',
      'Abgabe an Kommunen für die Nutzung öffentlicher Wege.',
    ],
    ['Energiesteuer', 'Staatliche Steuer auf den Stromverbrauch.'],
    ['Abgabe KWKG', 'Förderung der Kraft-Wärme-Kopplung.'],
    [
      'Offshore-Haftungsumlage',
      'Kosten für Schäden an Offshore-Windparkleitungen.',
    ],
    [
      '§ 19 StromNEV Umlage',
      'Ausgleich für Netzentgelterleichterungen für Großverbraucher.',
    ],
    [
      `Grundpreis ${companyName}`,
      'Der von uns erhobene Aufschlag, hiermit finanzieren wir alle unsere Kosten.',
    ],
    [
      'Grundpreis Netzbetreiber',
      'Fester Betrag für die Nutzung des Stromnetzes.',
    ],
    [
      'Messung und Ablesung',
      'Kosten für den Betrieb und die Ablesung deines Stromzählers.',
    ],
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Hilfe zu den Tarifpreiskomponenten"
          className="text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="size-5" />
          <span className="sr-only">Hilfe zu den Tarifpreisen</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tarifpreise – Hilfe</DialogTitle>
          <DialogDescription className="sr-only">
            Erklärung der Preiskomponenten deines dynamischen Tarifs
            {contract.tariff !== null ? ` „${contract.tariff}“` : ''}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Dein Verbrauch wird{' '}
            <strong>viertelstündlich genau abgerechnet</strong>. Du zahlst
            keinen monatlichen Abschlag, sondern erhältst eine direkte
            Monatsrechnung.
          </p>
          <p>
            Dein Tarif setzt sich aus verschiedenen{' '}
            <strong>Preiskomponenten</strong> zusammen, die hier transparent
            aufgeschlüsselt werden.
          </p>
          <p>Wir geben alle Steuern und Abgaben direkt an dich weiter.</p>
          <p>
            Die Höhe unseres Aufschlags auf den Arbeits- und Grundpreis
            garantieren wir dir.
          </p>
          <hr />
          {glossary.map(([term, explanation]) => (
            <div key={term}>
              <p className="font-semibold">{term}</p>
              <p className="text-muted-foreground">{explanation}</p>
            </div>
          ))}
          <div className="bg-primary text-primary-foreground rounded px-3 py-2">
            <strong>Zusätzlich: Beschaffungskosten (Börse)</strong>
            <br />
            Da du einen dynamischen Tarif hast, werden die tatsächlichen
            Einkaufskosten des Stroms an der Börse direkt auf deinen
            Arbeitspreis aufgeschlagen. Dieser Anteil schwankt täglich und wird
            separat ausgewiesen.
          </div>
          <p className="text-muted-foreground text-xs">
            Alle Preise verstehen sich zuzüglich der gesetzlichen
            Mehrwertsteuer.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Chart-Link einer Karte (Lastgänge/Abrechnung), analog zu den Link-Buttons
 * der alten Verbrauchskarten.
 */
function ChartPageLink({
  customerId,
  contractId,
  page,
  title,
  children,
}: {
  customerId: string
  contractId: string
  page: 'abrechnung' | 'lastgaenge'
  title: string
  children: ReactNode
}) {
  return (
    <Button asChild className="w-full">
      {page === 'abrechnung' ? (
        <Link
          to="/kunde/$customerId/vertrag/$contractId/abrechnung"
          params={{ customerId, contractId }}
          title={title}
        >
          {children}
        </Link>
      ) : (
        <Link
          to="/kunde/$customerId/vertrag/$contractId/lastgaenge"
          params={{ customerId, contractId }}
          title={title}
        >
          {children}
        </Link>
      )}
    </Button>
  )
}

/** Verbrauchsdaten-Karte des klassischen Tarifs. */
function UsageCard({ contract, customerId, contractId }: CardProps) {
  const { data: tenant } = useQuery(tenantQuery)
  const meterPoint = primaryMeterPoint(contract)
  const meterCount = latestMeterCount(meterPoint)
  const hasSmartMeter = primaryMeter(meterPoint)?.smart_meter === true

  return (
    <InfoCard
      icon={<Gauge className="size-4" />}
      title="Verbrauchsdaten"
      footer={
        <>
          <ChangeLink
            customerId={customerId}
            contractId={contractId}
            formType="meter-count"
            title="Zählerstand mitteilen"
          >
            Zählerstand mitteilen
          </ChangeLink>
          {hasSmartMeter && tenant?.features.edi_load_profiles === true ? (
            <ChartPageLink
              customerId={customerId}
              contractId={contractId}
              page="lastgaenge"
              title="Auflistung deiner Verbräuche."
            >
              Lastgang anzeigen
            </ChartPageLink>
          ) : null}
        </>
      }
    >
      {meterCount !== null ? (
        <>
          <InfoRow label="Zählernummer:">{meterCount.meter_number}</InfoRow>
          <InfoRow label="Letzter Zählerstand:">
            {meterCount.meter_count_2 !== null ? (
              <>
                {meterCount.meter_count_1 !== null ? (
                  <>
                    HT: {formatNumber(meterCount.meter_count_1)} kWh
                    <br />
                  </>
                ) : null}
                NT: {formatNumber(meterCount.meter_count_2)} kWh
              </>
            ) : meterCount.meter_count_1 !== null ? (
              `${formatNumber(meterCount.meter_count_1)} kWh`
            ) : (
              '–'
            )}
            {meterCount.meter_count_3 !== null ? (
              <>
                <br />
                {formatNumber(meterCount.meter_count_3)} kWh
              </>
            ) : null}
          </InfoRow>
          {meterCount.yearly_usage !== null ? (
            <InfoRow label="Geschätzter Jahresverbrauch:">
              {formatNumber(meterCount.yearly_usage)} kWh pro Jahr
            </InfoRow>
          ) : null}
        </>
      ) : (
        <p className="text-sm">Kein Zählerstand vorhanden.</p>
      )}
    </InfoCard>
  )
}

/** Verbrauchsdaten-Karte des dynamischen Tarifs (Smart Meter). */
function DynamicUsageCard({
  customerId,
  contractId,
}: {
  customerId: string
  contractId: string
}) {
  const { data: tenant } = useQuery(tenantQuery)
  const showBilled = tenant?.features.dynamic_electric_prices === true
  const showEdi = tenant?.features.edi_load_profiles === true
  const chartLinks =
    showBilled || showEdi ? (
      <>
        {showBilled ? (
          <ChartPageLink
            customerId={customerId}
            contractId={contractId}
            page="abrechnung"
            title="Darstellung Deiner bisher abgerechneten Verbräuche."
          >
            Abgerechnete Lastgänge
          </ChartPageLink>
        ) : null}
        {showEdi ? (
          <ChartPageLink
            customerId={customerId}
            contractId={contractId}
            page="lastgaenge"
            title="Auflistung deiner Verbräuche."
          >
            Lastgang anzeigen
          </ChartPageLink>
        ) : null}
      </>
    ) : undefined

  return (
    <InfoCard
      icon={<Gauge className="size-4" />}
      title="Verbrauchsdaten"
      footer={chartLinks}
    >
      <p className="text-sm">
        Wir erhalten deine Zählerstände/Verbräuche automatisch über deinen Smart
        Meter.
      </p>
      <p className="text-sm">Du musst uns keine Zählerstände mitteilen.</p>
    </InfoCard>
  )
}

/** Abnahmestelle (Lieferadresse) mit „Umzug melden“. */
function DeliveryAddressCard({ contract, customerId, contractId }: CardProps) {
  const meterPoint = primaryMeterPoint(contract)
  const meter = primaryMeter(meterPoint)

  return (
    <InfoCard
      icon={<House className="size-4" />}
      title="Abnahmestelle"
      footer={
        <ChangeLink
          customerId={customerId}
          contractId={contractId}
          formType="delivery-address"
          title="Umzug melden"
        >
          Umzug melden
        </ChangeLink>
      }
    >
      <InfoRow label="Adresse:">
        {meterPoint !== null ? (
          <>
            {meterPoint.zip} {meterPoint.city}, {meterPoint.street}{' '}
            {meterPoint.street_number} {meterPoint.address_additive}
          </>
        ) : (
          '–'
        )}
      </InfoRow>
      <InfoRow label="Zählernummer:">{meter?.meter_number ?? '–'}</InfoRow>
      <InfoRow label="MaLo:">{meterPoint?.malo_id ?? '–'}</InfoRow>
      <InfoRow label="Belieferungsbeginn:">
        {meterPoint?.delivery_from != null
          ? formatDate(meterPoint.delivery_from)
          : '–'}
      </InfoRow>
      {meterPoint?.delivery_until != null ? (
        <InfoRow label="Belieferungsende:">
          {formatDate(meterPoint.delivery_until)}
        </InfoRow>
      ) : null}
    </InfoCard>
  )
}

function BankCard({ contract, customerId, contractId }: CardProps) {
  return (
    <InfoCard
      icon={<Banknote className="size-4" />}
      title="Bankverbindung"
      footer={
        <ChangeLink
          customerId={customerId}
          contractId={contractId}
          formType="bank"
          title="Ändere hier deine Bankverbindung"
        >
          Bankdaten ändern
        </ChangeLink>
      }
    >
      <InfoRow label="IBAN:">
        {contract.bank.iban !== null ? formatIban(contract.bank.iban) : '–'}
      </InfoRow>
      <InfoRow label="Bank:">{contract.bank.bank ?? '–'}</InfoRow>
      <InfoRow label="Kontoinhaber:">
        {contract.bank.account_owner ?? '–'}
      </InfoRow>
      <InfoRow label="SEPA-Lastschrift freigegeben:">
        {contract.bank.sepa === true ? 'Ja' : 'Nein'}
      </InfoRow>
    </InfoCard>
  )
}

function ContactCard({ contract, customerId, contractId }: CardProps) {
  return (
    <InfoCard
      icon={<Phone className="size-4" />}
      title="Deine Kontaktdaten"
      footer={
        <ChangeLink
          customerId={customerId}
          contractId={contractId}
          formType="contact-data"
          title="Ändere hier deine Kontaktdaten"
        >
          Kontaktdaten ändern
        </ChangeLink>
      }
    >
      <InfoRow label="Telefonnummer:">{contract.contact.phone ?? '–'}</InfoRow>
      <InfoRow label="Mobilnummer:">{contract.contact.mobile ?? '–'}</InfoRow>
      <InfoRow label="E-Mail-Adresse:">{contract.contact.mail ?? '–'}</InfoRow>
      <InfoRow label="Kommunikation per Mail:">
        {contract.contact.send_emails === true ? 'Ja' : 'Nein'}
      </InfoRow>
    </InfoCard>
  )
}

/** Vertragsdaten inkl. Rechnungsadresse, Kündigung und ggf. Widerruf. */
function ContractDataCard({ contract, customerId, contractId }: CardProps) {
  const contact = contract.billing_contact
  const address = contract.billing_address
  const partnerName = [
    contact.company,
    contact.salutation,
    contact.title,
    contact.first_name,
    contact.last_name,
  ]
    .filter((part): part is string => part !== null && part !== '')
    .join(' ')

  return (
    <InfoCard
      icon={<FileText className="size-4" />}
      title="Vertragsdaten"
      footer={
        <>
          <ChangeLink
            customerId={customerId}
            contractId={contractId}
            formType="billing-address"
            title="Ändere hier deine Rechnungsadresse"
          >
            Rechnungsadresse ändern
          </ChangeLink>
          {isRevocable(contract.received_at) ? (
            <ChangeLink
              customerId={customerId}
              contractId={contractId}
              formType="revocation"
              title="Reiche hier deinen Widerruf ein."
            >
              Widerruf einreichen
            </ChangeLink>
          ) : null}
          <ChangeLink
            customerId={customerId}
            contractId={contractId}
            formType="termination"
            title="Kündige hier deinen Vertrag."
          >
            Vertrag kündigen
          </ChangeLink>
        </>
      }
    >
      <InfoRow label="Vertragsnummer:">{contract.contract_number}</InfoRow>
      <InfoRow label="Tarif:">{contract.tariff ?? '–'}</InfoRow>
      <InfoRow label="Vertragspartner:">
        {partnerName !== '' ? partnerName : '–'}
      </InfoRow>
      <InfoRow label="Rechnungsadresse:">
        {address.zip} {address.city} | {address.street} {address.street_number}{' '}
        {address.address_additive}
      </InfoRow>
      <InfoRow label="Vertragsbeginn:">
        {contract.delivery_start !== null
          ? formatDate(contract.delivery_start)
          : '–'}
      </InfoRow>
      {contract.delivery_end !== null ? (
        <InfoRow label="Lieferende:">
          {formatDate(contract.delivery_end)}
        </InfoRow>
      ) : null}
      <InfoRow label="Mindestvertragslaufzeit:">
        {contract.contract_term !== null
          ? formatDate(contract.contract_term)
          : '–'}
      </InfoRow>
      <InfoRow label="Nächstes Kündigungsdatum:">
        {contract.earliest_termination_date !== null
          ? formatDate(contract.earliest_termination_date)
          : '–'}
      </InfoRow>
    </InfoCard>
  )
}
