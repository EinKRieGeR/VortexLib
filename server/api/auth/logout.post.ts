import { removeVortexSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  removeVortexSession(event)
  return { success: true }
})
