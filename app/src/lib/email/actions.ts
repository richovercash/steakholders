'use server'

import { resend, defaultFrom, isEmailConfigured } from './resend'
import { getNotificationEmailTemplate } from './templates'
import type { NotificationType } from '@/types/database'

interface SendNotificationEmailParams {
  to: string
  type: NotificationType
  title: string
  body: string
  orderId?: string
  recipientName?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendNotificationEmail(params: SendNotificationEmailParams): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log('[Email] Resend not configured, skipping email notification')
    return { success: true } // Consider it a success if email isn't configured
  }

  const template = getNotificationEmailTemplate(
    params.type,
    params.title,
    params.body,
    params.orderId,
    params.recipientName
  )

  if (!template) {
    console.log('[Email] No template for notification type:', params.type)
    return { success: true }
  }

  try {
    const result = await resend!.emails.send({
      from: defaultFrom,
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (result.error) {
      console.error('[Email] Failed to send:', result.error)
      return { success: false, error: result.error.message }
    }

    console.log('[Email] Sent successfully:', result.data?.id)
    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('[Email] Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

interface SendBulkNotificationEmailsParams {
  recipients: Array<{
    email: string
    name?: string
  }>
  type: NotificationType
  title: string
  body: string
  orderId?: string
}

export async function sendBulkNotificationEmails(
  params: SendBulkNotificationEmailsParams
): Promise<{ sent: number; failed: number }> {
  if (!isEmailConfigured()) {
    console.log('[Email] Resend not configured, skipping bulk email')
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  // Send emails in parallel with a concurrency limit
  const batchSize = 5
  for (let i = 0; i < params.recipients.length; i += batchSize) {
    const batch = params.recipients.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map((recipient) =>
        sendNotificationEmail({
          to: recipient.email,
          type: params.type,
          title: params.title,
          body: params.body,
          orderId: params.orderId,
          recipientName: recipient.name,
        })
      )
    )

    for (const result of results) {
      if (result.success) {
        sent++
      } else {
        failed++
      }
    }
  }

  console.log(`[Email] Bulk send complete: ${sent} sent, ${failed} failed`)
  return { sent, failed }
}
