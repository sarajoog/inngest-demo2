import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { helloTicket } from '@/inngest/functions/hello-ticket'

export const { GET } = serve({
  client: inngest,
  functions: [helloTicket]
})