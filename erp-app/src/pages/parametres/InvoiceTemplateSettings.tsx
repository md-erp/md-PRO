import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../components/ui/Toast'

// ────────────────────────────────────────────────────────────────────────────────
// Variables that can be used in a Custom HTML template
// ────────────────────────────────────────────────────────────────────────────────
const AVAILABLE_VARS = [
  ['{{doc.number}}', 'Numéro du document'],
  ['{{doc.date}}', 'Date'],
  ['{{doc.type}}', 'Type (FACTURE, DEVIS…)'],
  ['{{doc.total_ht}}', 'Total HT'],
  ['{{doc.total_tva}}', 'Total TVA'],
  ['{{doc.total_ttc}}', 'Total TTC'],
  ['{{client.name}}', 'Nom du client'],
  ['{{client.address}}', 'Adresse client'],
  ['{{client.ice}}', 'ICE client'],
  ['{{client.rc}}', 'RC client'],
  ['{{company.name}}', 'Nom entreprise'],
  ['{{company.phone}}', 'Téléphone'],
  ['{{company.email}}', 'Email'],
  ['{{company.ice}}', 'ICE entreprise'],
  ['{{company.bank}}', 'Nom banque'],
  ['{{company.rib}}', 'RIB'],
  ['{{lines_html}}', 'Lignes produits (HTML <tr>…</tr>)'],
]

const DEFAULT_CUSTOM_TPL = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 12px; border: 1px solid #ccc; }
  th { background: #1B3A6B; color: #fff; }
  .total { background: #1B3A6B; color:#fff; font-weight:900; }
</style>
</head>
<body>
  <h1 style="color:#1B3A6B;">{{doc.type}} – {{doc.number}}</h1>
  <p><strong>Date :</strong> {{doc.date}}</p>
  <h2>{{client.name}}</h2>
  <p>{{client.address}}</p>

  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th>Qté</th>
        <th>Prix U</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>
      {{lines_html}}
    </tbody>
    <tfoot>
      <tr><td colspan="3">Total HT</td><td>{{doc.total_ht}}</td></tr>
      <tr><td colspan="3">TVA</td><td>{{doc.total_tva}}</td></tr>
      <tr class="total"><td colspan="3">TOTAL TTC</td><td>{{doc.total_ttc}}</td></tr>
    </tfoot>
  </table>
</body></html>`

// ────────────────────────────────────────────────────────────────────────────────
export default function InvoiceTemplateSettings() {
  const [mode, setMode] = useState<'master' | 'custom'>('master')
  const [footer, setFooter] = useState('Merci pour votre confiance')
  const [payTerms, setPayTerms] = useState('')
  const [customTpl, setCustomTpl] = useState(DEFAULT_CUSTOM_TPL)
  const [saving, setSaving] = useState(false)
  const [showVars, setShowVars] = useState(false)

  useEffect(() => {
    Promise.all([
      api.settingsGet('invoice_template').catch(() => null),
      api.settingsGet('invoice_footer').catch(() => null),
      api.settingsGet('payment_terms').catch(() => null),
      api.settingsGet('custom_pdf_template').catch(() => null),
    ]).then(([tmpl, ft, pt, ctpl]: any[]) => {
      if (tmpl === 'custom') setMode('custom')
      if (ft) setFooter(ft)
      if (pt) setPayTerms(pt)
      if (ctpl && ctpl.trim().length > 10) setCustomTpl(ctpl)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await api.settingsSetMany({
        invoice_template: mode === 'custom' ? 'custom' : 'master',
        invoice_footer: footer,
        payment_terms: payTerms,
        custom_pdf_template: mode === 'custom' ? customTpl : '',
      })
      toast('Paramètres sauvegardés ✅')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modèle de document</h2>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
        </button>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setMode('master')}
          className={`rounded-xl border-2 p-5 text-left transition-all ${mode === 'master'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
        >
          <div className="text-2xl mb-2">⚡</div>
          <div className="font-bold text-gray-800 dark:text-gray-100 mb-1">Smart Master Template</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Modèle intelligent unique — adapte automatiquement la position du logo selon
            ses dimensions (portrait → côté gauche, paysage → centré en haut).
            Toutes les informations de l'entreprise et du client sont affichées automatiquement.
          </div>
          {mode === 'master' && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-semibold">
              <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px]">✓</span>
              Actif
            </div>
          )}
        </button>

        <button
          onClick={() => setMode('custom')}
          className={`rounded-xl border-2 p-5 text-left transition-all ${mode === 'custom'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
        >
          <div className="text-2xl mb-2">🎨</div>
          <div className="font-bold text-gray-800 dark:text-gray-100 mb-1">Template HTML Personnalisé</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Écrivez ou collez votre propre code HTML. Utilisez les variables{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-[10px]">{'{{doc.number}}'}</code>{' '}
            pour insérer dynamiquement les données du document.
          </div>
          {mode === 'custom' && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-semibold">
              <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px]">✓</span>
              Actif
            </div>
          )}
        </button>
      </div>

      {/* Custom HTML editor */}
      {mode === 'custom' && (
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Code HTML du modèle
            </label>
            <button
              type="button"
              onClick={() => setShowVars(v => !v)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 transition"
            >
              {showVars ? '🔼 Masquer' : '📋 Variables disponibles'}
            </button>
          </div>

          {showVars && (
            <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              {AVAILABLE_VARS.map(([v, label]) => (
                <div key={v} className="flex items-start gap-2 text-xs">
                  <code
                    className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono cursor-pointer hover:bg-blue-100 shrink-0"
                    onClick={() => {
                      setCustomTpl(prev => prev + v)
                      toast('Variable copiée dans l\'éditeur')
                    }}
                    title="Cliquer pour insérer"
                  >
                    {v}
                  </code>
                  <span className="text-gray-500 dark:text-gray-400 pt-0.5">{label}</span>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={customTpl}
            onChange={e => setCustomTpl(e.target.value)}
            className="w-full h-96 font-mono text-xs rounded-lg border border-gray-300 dark:border-gray-600 p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
            spellCheck={false}
          />
          <p className="text-xs text-gray-400">
            ⚠️ Votre HTML sera rendu directement dans un navigateur Chromium. Incluez les balises <code>&lt;!DOCTYPE html&gt;</code>, <code>&lt;head&gt;</code> et <code>&lt;body&gt;</code>.
          </p>
        </div>
      )}

      {/* Common footer texts */}
      <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message de fin de document
          </label>
          <input
            value={footer}
            onChange={e => setFooter(e.target.value)}
            className="input"
            placeholder="Merci pour votre confiance"
          />
          <p className="text-xs text-gray-400 mt-1">Apparaît en bas de chaque document PDF</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Conditions de paiement
          </label>
          <input
            value={payTerms}
            onChange={e => setPayTerms(e.target.value)}
            className="input"
            placeholder="Ex: Paiement à 30 jours"
          />
          <p className="text-xs text-gray-400 mt-1">Affiché sous le message de fin</p>
        </div>
      </div>

    </div>
  )
}
