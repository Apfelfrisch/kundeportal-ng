import { Fragment } from 'react'
import type { ReactNode } from 'react'

/**
 * Rendert den vertrauenswürdigen Info-HTML-Text der API (Erfolgsdialog der
 * Änderungsformulare) über einen kleinen Allowlist-Parser statt
 * `dangerouslySetInnerHTML`: Erlaubt sind nur h2, p, br, a (href), strong
 * und em – alles andere wird als Text ausgegeben.
 */

const ALLOWED_TAGS = new Set(['H2', 'P', 'BR', 'A', 'STRONG', 'EM'])

function renderNode(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  const children = Array.from(element.childNodes).map((child, index) =>
    renderNode(child, index),
  )

  if (!ALLOWED_TAGS.has(element.tagName)) {
    return <Fragment key={key}>{children}</Fragment>
  }

  switch (element.tagName) {
    case 'BR':
      return <br key={key} />
    case 'H2':
      return (
        <h2 key={key} className="text-lg font-semibold">
          {children}
        </h2>
      )
    case 'A': {
      const href = element.getAttribute('href') ?? ''
      const safeHref =
        href.startsWith('/') ||
        href.startsWith('https://') ||
        href.startsWith('http://')
          ? href
          : undefined
      return (
        <a key={key} href={safeHref} className="text-primary underline">
          {children}
        </a>
      )
    }
    case 'STRONG':
      return <strong key={key}>{children}</strong>
    case 'EM':
      return <em key={key}>{children}</em>
    default:
      return (
        <p key={key} className="text-sm">
          {children}
        </p>
      )
  }
}

export function InfoHtml({ html }: { html: string }) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  return (
    <div className="space-y-3">
      {Array.from(doc.body.childNodes).map((node, index) =>
        renderNode(node, index),
      )}
    </div>
  )
}
