import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuthStore, isUserOnline } from '../../store/auth.store'
import { toast } from '../../components/ui/Toast'

const ALL_PAGES = [
  { id: 'rapports',     label: 'Rapports',     icon: '📈' },
  { id: 'documents',    label: 'Documents',    icon: '📄' },
  { id: 'paiements',    label: 'Paiements',    icon: '💳' },
  { id: 'parties',      label: 'Parties',      icon: '👥' },
  { id: 'stock',        label: 'Stock',        icon: '📦' },
  { id: 'achats',       label: 'Achats',       icon: '🛒' },
  { id: 'production',   label: 'Production',   icon: '🏭' },
  { id: 'comptabilite', label: 'Comptabilité', icon: '📊' },
  { id: 'parametres',   label: 'Paramètres',   icon: '⚙️' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', accountant: 'Comptable',
  sales: 'Commercial', warehouse: 'Magasinier',
}

interface Props { userId: number; isOnline: boolean; onClose: () => void }

export default function UserDetail({ userId, onClose: _onClose }: Props) {
  const { user: currentUser } = useAuthStore()
  const [user, setUser]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  const online = isUserOnline(userId)
  const isSelf = userId === currentUser?.id

  useEffect(() => {
    setLoading(true)
    api.getUsers()
      .then((users: any) => {
        const u = (users ?? []).find((x: any) => x.id === userId)
        setUser(u ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { toast('Les mots de passe ne correspondent pas', 'error'); return }
    if (pwForm.next.length < 6) { toast('Minimum 6 caractères', 'error'); return }
    setPwSaving(true)
    try {
      await api.login({ email: user.email, password: pwForm.current })
      await api.updateUser({
        id: user.id, name: user.name, email: user.email,
        role: user.role, is_active: 1,
        password: pwForm.next, permissions: user.permissions ?? [],
      })
      toast('Mot de passe modifié avec succès')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (e: any) {
      toast(e.message?.includes('incorrect') ? 'Mot de passe actuel incorrect' : e.message, 'error')
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return (
    <div className="p-8 text-center text-gray-400 animate-pulse">
      <div className="text-3xl mb-2">👤</div>
      <div className="text-sm">Chargement...</div>
    </div>
  )
  if (!user) return null

  const fmtDate = (d: string) =>
    new Date(d.endsWith('Z') ? d : d + 'Z')
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
              {user.name[0]?.toUpperCase()}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{user.name}</h2>
              {isSelf && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Vous</span>}
              {online
                ? <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">● En ligne</span>
                : <span className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">Hors ligne</span>
              }
            </div>
            <div className="text-sm text-gray-500 mt-0.5">{user.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                {user.is_active ? '✓ Actif' : '✗ Inactif'}
              </span>
            </div>
          </div>
        </div>

        {/* Infos */}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-500">Membre depuis</span>
            <span className="font-medium">{new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-500">Dernier accès</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {user.last_login ? fmtDate(user.last_login) : <span className="text-gray-400 italic">Jamais connecté</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Modules accessibles */}
        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">🔐 Modules accessibles</div>
          {user.role === 'admin' ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
              🔓 Accès complet à tous les modules
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {ALL_PAGES.map(p => {
                const hasAccess = (user.permissions ?? []).includes(p.id)
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
                    ${hasAccess
                      ? 'bg-primary/5 border-primary/20 text-gray-700 dark:text-gray-200'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400 opacity-40'}`}>
                    <span>{p.icon}</span>
                    <span className="text-sm font-medium">{p.label}</span>
                    <span className="ml-auto text-xs">{hasAccess ? '✓' : '✗'}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* تغيير كلمة المرور — للمستخدم نفسه فقط */}
        {isSelf && (
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">🔒 Changer le mot de passe</div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mot de passe actuel</label>
                <input type="password" value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className="input" placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nouveau mot de passe</label>
                <input type="password" value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  className="input" placeholder="Min. 6 caractères" required autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirmer</label>
                <input type="password" value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className={`input ${pwForm.confirm && pwForm.confirm !== pwForm.next ? 'border-red-400' : ''}`}
                  placeholder="••••••••" required autoComplete="new-password" />
                {pwForm.confirm && pwForm.confirm !== pwForm.next && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              <button type="submit"
                disabled={pwSaving || !pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm}
                className="btn-primary w-full justify-center disabled:opacity-50">
                {pwSaving ? 'Modification...' : '🔒 Modifier le mot de passe'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
