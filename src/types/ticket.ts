export interface Ticket {
  id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'closed'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
  assignedTo: string | null
  relatedSkills: string[]
}