import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { Resolver } from 'react-hook-form'

import { GENERIC_ERROR_MESSAGE, isApiError } from '#/api/client'
import { InfoHtml } from '#/components/customer/info-html'
import { DateInput } from '#/components/shared/date-picker'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { changeRequestConfig } from '#/lib/change-requests'
import { applyApiErrorsToForm } from '#/lib/forms'
import { useSubmitChangeRequest } from '#/queries/contracts'
import type {
  ChangeRequestField,
  ChangeRequestType,
  ChangeRequestValues,
} from '#/lib/change-requests'
import type { Contract } from '#/types/api'

const colClasses: Record<number, string> = {
  12: 'md:col-span-12',
  8: 'md:col-span-8',
  6: 'md:col-span-6',
  4: 'md:col-span-4',
  3: 'md:col-span-3',
}

/**
 * Generisches Änderungsformular: rendert die Felder aus der
 * `changeRequestConfig`, schickt den Honeypot `bot-check` immer LEER mit und
 * zeigt nach dem Erfolg den deutschen Info-Text der API in einem Dialog.
 */
export function ChangeRequestForm({
  customerId,
  contractId,
  type,
  contract,
}: {
  customerId: string
  contractId: string
  type: ChangeRequestType
  contract: Contract
}) {
  const config = changeRequestConfig(type, contract)
  const navigate = useNavigate()
  const submitChangeRequest = useSubmitChangeRequest(
    customerId,
    contractId,
    type,
  )
  const [successInfo, setSuccessInfo] = useState<string | null>(null)

  const form = useForm<ChangeRequestValues>({
    resolver: zodResolver(config.schema) as Resolver<ChangeRequestValues>,
    defaultValues: config.defaults,
  })

  const fieldNames = config.fields.map((field) => field.name)

  async function onSubmit(values: ChangeRequestValues) {
    try {
      const response = await submitChangeRequest.mutateAsync(values)
      setSuccessInfo(response.info)
    } catch (error) {
      if (isApiError(error)) {
        applyApiErrorsToForm(error, form.setError, fieldNames)
      } else {
        form.setError('root', { message: GENERIC_ERROR_MESSAGE })
      }
    }
  }

  async function closeSuccessDialog() {
    setSuccessInfo(null)
    await navigate({
      to: '/kunde/$customerId/vertrag/$contractId',
      params: { customerId, contractId },
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link
            to="/kunde/$customerId/vertrag/$contractId"
            params={{ customerId, contractId }}
          >
            <ArrowLeft className="size-4" />
            Zurück zum Vertrag
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold">{config.title}</h1>
      </div>

      <div className="space-y-2 text-sm">
        {config.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {config.noticeTitle !== undefined ? (
          <p className="font-semibold">{config.noticeTitle}</p>
        ) : null}
        {config.notice?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {config.bullets !== undefined ? (
          <ul className="list-disc space-y-1 pl-5">
            {config.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <Form {...form}>
        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="space-y-6"
          noValidate
        >
          {form.formState.errors.root ? (
            <Alert variant="destructive">
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {config.fields.map((fieldConfig) => (
              <ChangeRequestFormField
                key={fieldConfig.name}
                form={form}
                fieldConfig={fieldConfig}
              />
            ))}
          </div>

          {/* Honeypot: für Menschen unsichtbar, muss IMMER leer bleiben. */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor={`bot-check-${type}`}>Bitte leer lassen</label>
            <input
              id={`bot-check-${type}`}
              type="text"
              name="bot-check"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Wird gesendet…' : 'Absenden'}
          </Button>
        </form>
      </Form>

      <Dialog
        open={successInfo !== null}
        onOpenChange={(open) => {
          if (!open) void closeSuccessDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Änderung übermittelt</DialogTitle>
          </DialogHeader>
          {successInfo !== null ? <InfoHtml html={successInfo} /> : null}
          <DialogFooter>
            <Button onClick={() => void closeSuccessDialog()}>
              Zurück zum Vertrag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChangeRequestFormField({
  form,
  fieldConfig,
}: {
  form: ReturnType<typeof useForm<ChangeRequestValues>>
  fieldConfig: ChangeRequestField
}) {
  const colClass = colClasses[fieldConfig.cols ?? 12] ?? 'md:col-span-12'

  if (fieldConfig.type === 'checkbox') {
    return (
      <FormField
        control={form.control}
        name={fieldConfig.name}
        render={({ field }) => (
          <FormItem className="md:col-span-12">
            <div className="flex items-start gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="font-normal">
                  {fieldConfig.label}
                </FormLabel>
                {fieldConfig.help !== undefined ? (
                  <FormDescription>{fieldConfig.help}</FormDescription>
                ) : null}
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <FormField
      control={form.control}
      name={fieldConfig.name}
      render={({ field }) => (
        <FormItem className={colClass}>
          <FormLabel>
            {fieldConfig.label}
            {fieldConfig.required === true ? (
              <span aria-hidden="true"> *</span>
            ) : null}
          </FormLabel>
          <FormControl>
            {fieldConfig.type === 'date' ? (
              <DateInput
                value={
                  typeof field.value === 'string' && field.value !== ''
                    ? field.value
                    : undefined
                }
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={fieldConfig.min}
                max={fieldConfig.max}
              />
            ) : fieldConfig.type === 'textarea' ? (
              <Textarea
                rows={3}
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
              />
            ) : (
              <Input
                type={fieldConfig.type}
                required={fieldConfig.required === true}
                placeholder={fieldConfig.placeholder}
                min={fieldConfig.min}
                max={fieldConfig.max}
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
              />
            )}
          </FormControl>
          {fieldConfig.help !== undefined ? (
            <FormDescription>{fieldConfig.help}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
