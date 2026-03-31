import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../components/ui/Toast'
import { useAppStore } from '../../store/app.store'
import type { DeviceConfig } from '../../types'

export default function CompanySettings() {
  const { config, setConfig } = useAppStore()
  const [form, setForm] = useState({
    company_name: '', company_ice: '', company_if: '',
    company_rc: '', company_address: '', company_phone: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) setForm({
      company_name:    config.company_name    ?? '',
      company_ice:     config.company_ice     ?? '',
      company_if:      config.company_if      ?? '',
      company_rc:      config.company_rc      ?? '',
      company_address: config.company_address ?? '',
      company_phone:   config.company_phone   ?? '',
    })
  }, [config])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.saveConfig(form)
      const updated = await api.getConfig() as DeviceConfig
      setConfig(updated)
      toast('Informations sauvegardées')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof typeof form, label: string, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input" placeholder={placeholder} />
    </div>
  )

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold mb-6">Informations de l'entreprise</h2>
      <form onSubmit={handleSave} className="space-y-4">
        {field('company_name', 'Nom de l\'entreprise *', 'Nom officiel')}
        <div className="grid grid-cols-3 gap-3">
          {field('company_ice', 'ICE', '000000000000000')}
          {field('company_if', 'IF', '12345678')}
          {field('company_rc', 'RC', 'RC12345')}
        </div>
        {field('company_phone', 'Téléphone', '+212 5 22 00 00 00')}
        {field('company_address', 'Adresse', 'Adresse complète')}

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </form>
    </div>
  )
}
