/**
 * Farbsatz eines Mandanten. Jeder Screen liest ausschließlich diese Tokens –
 * ein weiterer Mandant bekommt einen eigenen Satz unter `tenants/`, ohne
 * dass sich die Screens ändern.
 */
export interface ThemeTokens {
  slug: string
  /** Seitenhintergrund, auch der Kopfzeile. */
  bg: string
  /** Kartenfläche, Kartenrand und Trennlinien innerhalb einer Karte. */
  card: string
  border: string
  divider: string
  /** Text: normal, gedämpft, sehr blass (Chevrons). */
  fg: string
  muted: string
  faint: string
  /** Akzent für Icons, Links, Hervorhebungen – und dessen Kontrastfarbe. */
  accent: string
  accentFg: string
  iconBg: string
  /** Balken des Preisverlaufs (nicht aktuelle Stunde). */
  bar: string
  /** Verbrauchsdiagramm: Verbrauchsbalken, die drei Kostenanteile, Preislinie. */
  chartUsage: string
  chartExchange: string
  chartSupplier: string
  chartLegal: string
  chartLine: string
  /** Primäre Aktion. */
  btnBg: string
  btnFg: string
  btnBorder: string
  btnRadius: number
  /** Sekundäre Aktion. */
  outlineBg: string
  outlineBorder: string
  outlineFg: string
  /** Status-Badges. */
  okBg: string
  okFg: string
  openBg: string
  openFg: string
  danger: string
  /** Eckenradius von Karten und Feldern. */
  radius: number
}
