export interface User {
  id: string
  email: string
  fname: string
  lname: string
  role: 'admin' | 'moderator' | 'user'
  skills: string[],
  createdAt: Date,
}