import { useState } from 'react'
import { useAppStore } from '../../store/app.store'
import { api } from '../../lib/api'
import { toast } from '../../components/ui/Toast'
import type { LicenseInfo } from '../../types'

export default function LicenseSettings() {
  const { license, setLicense } = useAppStore()
  const [renewKey, setRenewKey] = useState('')
  const [renewing, setRenewing] = useState(false)
  const [showRenew, setShowRenew] = useState(false)

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault()
    if (!license?.companyName || !renewKey.trim()) return
    setRenewing(true)
    try {
      await api.activateLicense({ companyName: license.companyName, licenseKey: renewKey.trim() })
      const updated = await api.getLicense() as LicenseInfo
      setLicense(updated)
      toast('Licence renouvelée avec succès')
      setShowRenew(false)
      setRenewKey('')
    } catch (e: any) {
      toast(e.message || 'Clé invalide', 'error')
    } finally {
      setRenewing(false)
    }
  }

  const daysColor = !license ? 'text-gray-500'
    : license.isExpired      ? 'text-red-600'
    : license.isExpiringSoon ? 'text-orange-500'
    : 'text-green-600'

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold mb-6">Informations de licence</h2>

      <div className="card p-5 space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500">Entreprise</span>
          <span className="font-semibold">{license?.companyName ?? '—'}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500">Date d'expiration</span>
          <span className="font-medium">
            {license ? new Date(license.expiryDate).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            }) : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-500">Jours restants</span>
          <span className={`text-xl font-bold ${daysColor}`}>
            {license?.isExpired ? 'Expirée' : `${license?.daysRemaining ?? 0} jours`}
          </span>
        </div>

        {license?.isExpiringSoon && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-3 text-sm text-orange-700 dark:text-orange-400">
            ⚠️ Votre abonnement expire bientôt. Contactez votre revendeur pour renouveler.
          </div>
        )}
        {license?.isExpired && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            🔴 Licence expirée — Mode lecture seule activé.
          </div>
        )}
      </div>

      <div className="mt-4">
        {!showRenew ? (
          <button onClick={() => setShowRenew(true)} className="btn-secondary">
            🔄 Renouveler la licence
          </button>
        ) : (
          <form onSubmit={handleRenew} className="card p-4 space-y-3">
            <label className="block text-sm font-medium">Nouvelle clé de licence</label>
            <input value={renewKey} onChange={e => setRenewKey(e.target.value)}
              className="input font-mono text-xs" placeholder="Collez votre nouvelle clé ici" required autoFocus />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowRenew(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
              <button type="submit" disabled={renewing} className="btn-primary flex-1 justify-center">
                {renewing ? 'Vérification...' : '✅ Activer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
