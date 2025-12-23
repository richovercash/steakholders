import type { NotificationType } from '@/types/database'

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface OrderEmailParams {
  orderNumber: number
  title: string
  body: string
  orderLink: string
  recipientName?: string
}

interface MessageEmailParams {
  senderName: string
  messagePreview: string
  messagesLink: string
  recipientName?: string
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
`

const buttonStyles = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #2563eb;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
`

function wrapInLayout(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; ${baseStyles}">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Logo/Header -->
            <div style="text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; color: #111;">
                🥩 Steakholders
              </h1>
            </div>

            <!-- Content -->
            ${content}

            <!-- Footer -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">
                This is an automated notification from Steakholders.
              </p>
              <p style="margin: 8px 0 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color: #6b7280;">
                  Manage notification preferences
                </a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export function orderNotificationEmail(params: OrderEmailParams): EmailTemplate {
  const { orderNumber, title, body, orderLink, recipientName } = params

  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,'

  const html = wrapInLayout(`
    <p style="margin: 0 0 16px;">${greeting}</p>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #111;">
        Order #${orderNumber}
      </h2>
      <p style="margin: 0 0 8px; font-size: 16px; font-weight: 500; color: #2563eb;">
        ${title}
      </p>
      <p style="margin: 0; color: #4b5563;">
        ${body}
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${orderLink}" style="${buttonStyles}">
        View Order Details
      </a>
    </div>
  `, title)

  const text = `
${greeting}

Order #${orderNumber}: ${title}

${body}

View order details: ${orderLink}

---
This is an automated notification from Steakholders.
  `.trim()

  return {
    subject: `Order #${orderNumber}: ${title}`,
    html,
    text,
  }
}

export function messageNotificationEmail(params: MessageEmailParams): EmailTemplate {
  const { senderName, messagePreview, messagesLink, recipientName } = params

  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,'

  const html = wrapInLayout(`
    <p style="margin: 0 0 16px;">${greeting}</p>

    <p style="margin: 0 0 16px;">
      You have a new message from <strong>${senderName}</strong>:
    </p>

    <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #4b5563; font-style: italic;">
        "${messagePreview}"
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${messagesLink}" style="${buttonStyles}">
        View Messages
      </a>
    </div>
  `, `New message from ${senderName}`)

  const text = `
${greeting}

You have a new message from ${senderName}:

"${messagePreview}"

View messages: ${messagesLink}

---
This is an automated notification from Steakholders.
  `.trim()

  return {
    subject: `New message from ${senderName}`,
    html,
    text,
  }
}

export function getNotificationEmailTemplate(
  type: NotificationType,
  title: string,
  body: string,
  orderId?: string,
  recipientName?: string
): EmailTemplate | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Message notifications
  if (type === 'new_message') {
    return messageNotificationEmail({
      senderName: title.replace('New message from ', ''),
      messagePreview: body,
      messagesLink: `${appUrl}/dashboard/messages`,
      recipientName,
    })
  }

  // Order notifications
  if (type.startsWith('order_') && orderId) {
    const orderLink = `${appUrl}/dashboard/orders/${orderId}`
    // Extract order number from title if present
    const orderMatch = title.match(/Order #(\d+)/)
    const orderNumber = orderMatch ? parseInt(orderMatch[1]) : 0

    return orderNotificationEmail({
      orderNumber,
      title: title.replace(/Order #\d+:\s*/, ''),
      body,
      orderLink,
      recipientName,
    })
  }

  // Generic notification template for other types
  const html = wrapInLayout(`
    <h2 style="margin: 0 0 16px; font-size: 18px;">${title}</h2>
    <p style="margin: 0 0 24px; color: #4b5563;">${body}</p>
    <div style="text-align: center;">
      <a href="${appUrl}/dashboard" style="${buttonStyles}">
        Go to Dashboard
      </a>
    </div>
  `, title)

  const text = `
${title}

${body}

Go to dashboard: ${appUrl}/dashboard

---
This is an automated notification from Steakholders.
  `.trim()

  return {
    subject: title,
    html,
    text,
  }
}
