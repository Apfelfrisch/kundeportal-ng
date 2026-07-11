<x-mail::message>
eine neue Chatnachricht ist eingegangen.

**Kunde:** {{ $customerName }}

**Nachricht:**<br>
{{ $chatMessage }}

<x-mail::button :url="$url">
Im Kundenportal öffnen
</x-mail::button>
</x-mail::message>
