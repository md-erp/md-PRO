import type { User } from '../types'

// صلاحيات كل دور
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'documents', 'parties', 'stock', 'achats',
    'production', 'comptabilite', 'rapports', 'parametres',
  ],
  accountant: [
    'documents', 'parties', 'comptabilite', 'rapports',
  ],
  sales: [
    'documents', 'parties', 'stock',
  ],
  warehouse: [
    'stock', 'achats', 'production',
  ],
}

export function canAccess(user: User | null, page: string): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return ROLE_PERMISSIONS[user.role]?.includes(page) ?? false
}

export function getAccessiblePages(user: User | null): string[] {
  if (!user) return []
  return ROLE_PERMISSIONS[user.role] ?? []
}
