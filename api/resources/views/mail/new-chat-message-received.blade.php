<x-mail::message>
{{ $greeting }}

du hast eine neue Nachricht von uns in deinem Kundenportal.

<x-mail::button :url="$url">
Nachricht lesen
</x-mail::button>

{{ $adoption }}<br>
{{ $adoptionName }}
</x-mail::message>
