import { NonRetriableError } from 'inngest'
import { inngest } from '../client'
import db from '@/lib/db/firebase-admin'
import analyzeTicket from '@/lib/utils/ticket-ai'

export const onTicketCreate = inngest.createFunction(
  { id: 'on-ticket-create', retries: 3 }, // Function ID
  { event: 'on-ticket.create' }, // Trigger on ticket/create event
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data

      const ticket = await step.run('Fetch Ticket Details', async () => {
        // Fetch ticket details from the database
        const ticketObject = await db.collection('tickets').doc(ticketId).get()
        if (!ticketObject.exists) {
          throw new NonRetriableError('Ticket not found')
        }
        return ticketObject.data()
      })

      await step.run('Update-ticket-status', async () => {
        // Update the ticket status in the database
        await db.collection('tickets').doc(ticket.ticketId).update({ status: 'created' })
      })

      const aiResponse = await analyzeTicket(ticket)

      const relatedSkills = await step.run('ai-processing', async () => {
        let skills = []
        if (aiResponse) {
        // Update priority based on AI response
        await db.collection('tickets').doc(ticket.ticketId).
            update({ priority: !['low', 'medium', 'high'].includes(aiResponse.priority) ? 'medium' : aiResponse.priority,
                helpfulNote: aiResponse.helpfulNote,
                status: 'in_progress',
                relatedSkills: aiResponse.relatedSkills,
             })
             skills = aiResponse.relatedSkills
        }
        return skills
      })

      const moderator = await step.run('assign-moderator', async () => {
        if (relatedSkills.length > 0) {
          // Assign a moderator based on related skills and if the role is moderator
          const moderator = await db.collection('users').where('skills', 'array-contains-any', relatedSkills).where('role', '==', 'moderator').limit(1).get()
         
          if (moderator.docs.length > 0) {
            return moderator.docs[0].data()
          } else {
            // Assign the first admin
            const admin = await db.collection('users').where('role', '==', 'admin').limit(1).get()
            if (admin.docs.length > 0) {
              return admin.docs[0].data()
            }
          }
        }
      })
      
      // Assign the ticket to the found moderator or admin
      await db.collection('tickets').doc(ticket.ticketId).update({
        assignedTo: moderator.docs[0].data().id
      })

    } catch (error) {
      console.error('Error processing ticket creation:', error)
      throw new NonRetriableError('Failed to process ticket creation')
    }
  }
)