import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../components/ui/Toast'
import Modal from '../../components/ui/Modal'
import type { User } from '../../types'

const ROLES = [
  { value: 'admin',      label: 'Administrateur', color: 'badge-red' },
  { value: 'accountant', label: 'Comptable',       color: 'badge-blue' },
  { value: 'sales',      label: 'Commercial',      color: 'badge-green' },
  { value: 'warehouse',  label: 'Magasinier',      color: 'badge-orange' },
]

interface Props { isAdmin: boolean }

export default function UsersSettings({ isAdmin }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getUsers().then((r: any) => setUsers(r ?? []))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createUser(form)
      toast('Utilisateur créé')
      setModalOpen(false)
      setForm({ name: '', email: '', password: '', role: 'sales' })
      api.getUsers().then((r: any) => setUsers(r ?? []))
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(user: User) {
    try {
      await api.updateUser({ id: user.id, name: user.name, email: user.email, role: user.role, is_active: !user.is_active })
      toast(user.is_active ? 'Utilisateur désactivé' : 'Utilisateur activé', 'warning')
      api.getUsers().then((r: any) => setUsers(r ?? []))
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Gestion des utilisateurs</h2>
        {isAdmin && (
          <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">+ Nouvel utilisateur</button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nom</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Rôle</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Statut</th>
              {isAdmin && <th className="px-4 py-3 w-20"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map(u => {
              const role = ROLES.find(r => r.value === u.role)
              return (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={role?.color ?? 'badge-gray'}>{role?.label ?? u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={u.is_active ? 'badge-green' : 'badge-gray'}>
                      {u.is_active ? '✓ Actif' : '✗ Inactif'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleActive(u)}
                        className="text-xs text-gray-400 hover:text-primary">
                        {u.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel utilisateur">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom complet *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input" type="email" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe *</label>
            <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input" type="password" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rôle *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
