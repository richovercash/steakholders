import { Resend } from 'resend'

// Create Resend client - will be null if API key not configured
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Default sender - update when you verify your domain in Resend
export const defaultFrom = process.env.RESEND_FROM_EMAIL || 'Steakholders <onboarding@resend.dev>'

export function isEmailConfigured(): boolean {
  return resend !== null
}
