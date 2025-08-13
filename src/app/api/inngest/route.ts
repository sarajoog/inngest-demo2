import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { onTicketCreate } from '@/inngest/functions/on-ticket-create'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [onTicketCreate]
})