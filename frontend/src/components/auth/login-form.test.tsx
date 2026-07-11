import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ApiError } from '#/api/client'
import { LoginForm } from './login-form'

describe('LoginForm', () => {
  it('shows German validation errors and does not submit an empty form', async () => {
    const login = vi.fn()
    const user = userEvent.setup()
    render(<LoginForm login={login} />)

    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(
      await screen.findByText('Bitte gib eine gültige E-Mail-Adresse ein.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Bitte gib dein Passwort ein.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits e-mail and password on success', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginForm login={login} />)

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'kunde@example.de')
    await user.type(screen.getByLabelText('Passwort'), 'streng-geheim')
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'kunde@example.de',
        password: 'streng-geheim',
      })
    })
  })

  it('maps 422 errors from the API onto the fields', async () => {
    const login = vi.fn().mockRejectedValue(
      new ApiError(422, 'Diese Zugangsdaten stimmen nicht.', {
        errors: {
          email: [
            'Diese Zugangsdaten stimmen nicht mit unseren Daten überein.',
          ],
        },
      }),
    )
    const user = userEvent.setup()
    render(<LoginForm login={login} />)

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'kunde@example.de')
    await user.type(screen.getByLabelText('Passwort'), 'falsch')
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(
      await screen.findByText(
        'Diese Zugangsdaten stimmen nicht mit unseren Daten überein.',
      ),
    ).toBeInTheDocument()
  })

  it('shows unknown field errors as a form-level alert', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new ApiError(429, 'Zu viele Anmeldeversuche.'))
    const user = userEvent.setup()
    render(<LoginForm login={login} />)

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'kunde@example.de')
    await user.type(screen.getByLabelText('Passwort'), 'streng-geheim')
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(
      await screen.findByText('Zu viele Anmeldeversuche.'),
    ).toBeInTheDocument()
  })
})
