<x-mail::message>
Eine neue Änderungsmeldung wurde eingereicht.

**Kunde:** {{ $customerName }} (Kundennummer: {{ $customerNumber }})<br>
**Vertragsnummer:** {{ $contractNumber }}<br>
**Art der Änderung:** {{ $changeType }}

<x-mail::button :url="$url">
Im Kundenportal öffnen
</x-mail::button>
</x-mail::message>
