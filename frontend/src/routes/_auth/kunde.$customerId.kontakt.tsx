import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Clock,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Printer,
  Send,
  ShieldCheck,
  Signpost,
} from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { tenantQuery } from '#/queries/tenant'

export const Route = createFileRoute('/_auth/kunde/$customerId/kontakt')({
  component: ContactPage,
})

function ContactPage() {
  const { data: tenant } = useQuery(tenantQuery)

  if (tenant === undefined) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Kontakt</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const contact = tenant.contact
  const messenger = contact.messenger

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Kontakt</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headset className="size-4" />
              Erreichbarkeit
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <ContactRow icon={<Clock className="size-4" />} label="Öffnungszeiten">
              {contact['opening-hours'].long}
            </ContactRow>
            <ContactRow icon={<Phone className="size-4" />} label="Telefon">
              <a
                href={`tel:${contact.tel.technic}`}
                title={`Direkt bei ${tenant.name.short} anrufen.`}
                className="text-primary hover:underline"
              >
                {contact.tel.show}
              </a>
            </ContactRow>
            {contact.fax.show !== '' ? (
              <ContactRow icon={<Printer className="size-4" />} label="Fax">
                {contact.fax.show}
              </ContactRow>
            ) : null}
            <ContactRow icon={<Mail className="size-4" />} label="E-Mail">
              <a
                href={`mailto:${contact.email}`}
                title={`Direkt eine E-Mail an ${tenant.name.short} schreiben.`}
                className="text-primary hover:underline"
              >
                {contact.email}
              </a>
            </ContactRow>
            {messenger.sms.active ? (
              <ContactRow icon={<MessageSquare className="size-4" />} label="SMS">
                <a
                  href={`sms:${messenger.sms.show}`}
                  title={`Schreibe eine SMS an ${tenant.name.short}.`}
                  className="text-primary hover:underline"
                >
                  {messenger.sms.show}
                </a>
              </ContactRow>
            ) : null}
            {messenger.signal.active ? (
              <ContactRow icon={<ShieldCheck className="size-4" />} label="Signal">
                <a
                  href={`https://signal.me/#p/${messenger.signal.technic}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Direkt mit ${tenant.name.short} über Signal chatten.`}
                  className="text-primary hover:underline"
                >
                  {messenger.signal.show}
                </a>
              </ContactRow>
            ) : null}
            {messenger.telegram.active ? (
              <ContactRow icon={<Send className="size-4" />} label="Telegram">
                <a
                  href={`https://t.me/${messenger.telegram.technic}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Direkt mit ${tenant.name.short} über Telegram chatten.`}
                  className="text-primary hover:underline"
                >
                  {messenger.telegram.show}
                </a>
              </ContactRow>
            ) : null}
            {messenger['whats-app'].active ? (
              <ContactRow
                icon={<MessageCircle className="size-4" />}
                label="WhatsApp"
              >
                <a
                  href={`https://wa.me/${messenger['whats-app'].technic}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Direkt mit ${tenant.name.short} über WhatsApp chatten.`}
                  className="text-primary hover:underline"
                >
                  {messenger['whats-app'].show}
                </a>
              </ContactRow>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" />
              Postanschrift
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <ContactRow icon={<Building2 className="size-4" />} label="Empfänger">
              {tenant.name.long}
            </ContactRow>
            <ContactRow icon={<Signpost className="size-4" />} label="Straße">
              {contact.address.street}
            </ContactRow>
            <ContactRow icon={<MapPin className="size-4" />} label="Ort">
              {contact.address.city}
            </ContactRow>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}
