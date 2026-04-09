import { prisma } from './prisma'
export async function audit(userId: string, action: string, entity: string, entityId?: string, detail?: object) {
  try {
    await prisma.auditLog.create({ data: { userId, action, entity, entityId, detail: detail ? JSON.stringify(detail) : null } })
  } catch {}
}
