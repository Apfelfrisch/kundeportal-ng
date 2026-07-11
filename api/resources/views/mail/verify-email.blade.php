<x-mail::message>
{{ $greeting }}

du erhältst diese E-Mail, um deine E-Mail-Adresse für das {{ $companyName }} Kundenportal zu bestätigen.

Wenn du diese E-Mail nicht angefordert hast, kannst du sie ignorieren – du brauchst nichts weiter zu unternehmen.

<x-mail::button :url="$url">
E-Mail-Adresse bestätigen
</x-mail::button>

Falls du Fragen oder Probleme hast, melde dich gerne direkt bei uns.

{{ $adoption }}<br>
{{ $adoptionName }}
</x-mail::message>
