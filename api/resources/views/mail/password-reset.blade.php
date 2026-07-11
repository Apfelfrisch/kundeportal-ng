<x-mail::message>
{{ $greeting }}

du erhältst diese E-Mail, weil jemand für deinen Account beim {{ $companyName }} Kundenportal das Passwort zurücksetzen möchte.

<x-mail::button :url="$url">
Passwort zurücksetzen
</x-mail::button>

Der Link zum Zurücksetzen deines Passworts läuft in {{ $expireMinutes }} Minuten aus.

Wenn du das nicht warst und dein Passwort nicht zurücksetzen möchtest, kannst du diese E-Mail ignorieren – du brauchst nichts weiter zu unternehmen.

Falls du Fragen oder Probleme hast, melde dich gerne direkt bei uns.

Alle Kontaktmöglichkeiten findest du bei uns auf der Webseite: {{ $contactWebsite }}

{{ $adoption }}<br>
{{ $adoptionName }}
</x-mail::message>
