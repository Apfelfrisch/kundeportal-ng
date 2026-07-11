<x-mail::message>
{{ $greeting }}

wir haben dir einen Account in unserem Kundenportal erstellt.

Bitte klicke auf den folgenden Button, um dein Passwort zu setzen und deinen Account einzurichten.

Der Link ist 7 Tage gültig.

<x-mail::button :url="$url">
Account einrichten
</x-mail::button>

Falls du Fragen oder Probleme hast, melde dich gerne direkt bei uns.

{{ $adoption }}<br>
{{ $adoptionName }}
</x-mail::message>
