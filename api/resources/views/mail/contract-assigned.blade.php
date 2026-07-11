<x-mail::message>
{{ $greeting }}

dein Vertrag **{{ $contractNumber }}** wurde soeben mit dem Benutzerkonto mit dem Namen **{{ $userName }}** im Kundenportal von {{ $companyName }} verknüpft.

Um die Verknüpfung zu bestätigen, klicke bitte auf den folgenden Button:

<x-mail::button :url="$confirmUrl">
Verknüpfung bestätigen
</x-mail::button>

Falls du diese Verknüpfung nicht veranlasst hast, kannst du diese E-Mail ignorieren.

Alle Kontaktmöglichkeiten findest du auf unserer Webseite: {{ $contactWebsite }}

{{ $adoption }}<br>
{{ $adoptionName }}
</x-mail::message>
