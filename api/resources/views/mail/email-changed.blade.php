<x-mail::message>
{{ $greeting }}

die E-Mail-Adresse deines Kundenportal-Kontos bei {{ $companyName }} wurde geändert.

Die neue E-Mail-Adresse lautet: **{{ $newEmail }}**

Falls du diese Änderung nicht selbst vorgenommen hast, melde dich bitte umgehend bei uns.

Alle Kontaktmöglichkeiten findest du bei uns auf der Webseite: {{ $contactWebsite }}

{{ $adoption }}<br>
{{ $adoptionName }}
</x-mail::message>
