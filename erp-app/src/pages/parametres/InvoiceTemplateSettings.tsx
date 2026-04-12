import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../components/ui/Toast'

const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classique',
    description: 'Header coloré, style professionnel standard',
    preview: (
      <div className="w-full h-full bg-white rounded overflow-hidden text-[6px] leading-tight">
        <div className="bg-blue-900 text-white px-3 py-2 flex justify-between items-start">
          <div>
            <div className="font-black text-[10px]">FACTURE</div>
            <div className="text-blue-300 text-[6px]">N° FA-2026-001</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[8px]">Entreprise</div>
            <div className="text-blue-300">ICE: 000000000</div>
          </div>
        </div>
        <div className="px-3 py-2 flex justify-between">
          <div>
            <div className="bg-gray-100 rounded p-1 mb-1">
              <div className="text-gray-400 text-[5px]">CLIENT</div>
              <div className="font-semibold text-[7px]">Client X</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-[5px]">Date: 11/04/2026</div>
          </div>
        </div>
        <div className="px-3">
          <div className="bg-blue-900 text-white flex text-[5px] px-1 py-0.5 rounded-t">
            <span className="flex-1">Désignation</span><span className="w-8 text-right">Total</span>
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="flex text-[5px] px-1 py-0.5 border-b border-gray-100">
              <span className="flex-1 text-gray-600">Article {i}</span><span className="w-8 text-right">100 MAD</span>
            </div>
          ))}
          <div className="flex justify-end mt-1">
            <div className="text-[6px] font-bold text-blue-900">Total: 300 MAD</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Header noir élégant, style moderne minimaliste',
    preview: (
      <div className="w-full h-full bg-white rounded overflow-hidden text-[6px] leading-tight">
        <div className="bg-gray-900 text-white px-3 py-2 flex justify-between items-start">
          <div>
            <div className="font-black text-[12px] tracking-tight">FACTURE</div>
            <div className="text-gray-400 text-[6px] mt-0.5">N° FA-2026-001</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[8px]">Entreprise</div>
            <div className="text-gray-400 text-[5px] mt-0.5">ICE: 000000000</div>
          </div>
        </div>
        <div className="px-3 py-2 flex justify-between items-start">
          <div>
            <div className="text-gray-400 text-[5px] uppercase tracking-wide">Facturé à:</div>
            <div className="font-bold text-[8px] text-gray-900 mt-0.5">Client X</div>
            <div className="text-gray-500 text-[5px]">123 Rue, Ville</div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-[5px]">Total TTC:</div>
            <div className="font-black text-[11px] text-gray-900">300 MAD</div>
          </div>
        </div>
        <div className="px-3">
          <div className="flex text-[5px] px-1 py-0.5 border-b-2 border-gray-900 font-bold uppercase tracking-wide">
            <span className="flex-1">Articles</span><span className="w-8 text-right">Total</span>
          </div>
          {[1,2,3].map(i => (
            <div key={i} className={`flex text-[5px] px-1 py-0.5 border-b border-gray-100 ${i%2===0?'bg-gray-50':''}`}>
              <span className="flex-1 text-gray-600">Article {i}</span><span className="w-8 text-right font-semibold">100 MAD</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 h-1.5 mt-2"></div>
      </div>
    ),
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Rouge & bleu foncé, style entreprise professionnel',
    preview: (
      <div className="w-full h-full bg-white rounded overflow-hidden text-[6px] leading-tight">
        <div className="px-3 py-2 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{background:'#CC0000'}}>
              <div className="w-3 h-3 bg-white/90 rounded-sm"></div>
            </div>
            <div>
              <div className="font-bold text-[7px] text-gray-800">Entreprise</div>
              <div className="text-gray-400 text-[5px]">Adresse</div>
            </div>
          </div>
          <div className="font-black text-[14px] tracking-wider" style={{color:'#CC0000'}}>FACTURE</div>
        </div>
        <div className="px-3 py-1.5 flex justify-between">
          <div>
            <div className="font-bold text-[7px] text-gray-800">Client X</div>
            <div className="text-gray-400 text-[5px]">11/04/2026</div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-[5px] uppercase tracking-wide">Facture</div>
            <div className="font-bold text-[8px] text-gray-800">FA-2026-001</div>
          </div>
        </div>
        <div className="px-3">
          <div className="flex text-[5px] px-1 py-0.5 font-bold uppercase tracking-wide text-white" style={{background:'#1a2332'}}>
            <span className="flex-1">Produit</span><span className="w-8 text-right">Total</span>
          </div>
          {[1,2,3].map(i => (
            <div key={i} className={`flex text-[5px] px-1 py-0.5 border-b border-gray-100 ${i%2===0?'bg-gray-50':''}`}>
              <span className="flex-1 text-gray-600">Article {i}</span><span className="w-8 text-right">100 MAD</span>
            </div>
          ))}
          <div className="flex justify-end mt-1 gap-3 text-[5px]">
            <span className="text-gray-500">Total:</span>
            <span className="font-bold text-gray-800">300 MAD</span>
          </div>
        </div>
        <div className="mt-2 flex" style={{height:'8px'}}>
          <div className="flex-1" style={{background:'#1a2332'}}></div>
          <div style={{width:'24px',background:'#CC0000'}}></div>
        </div>
      </div>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Fond crème, typographie bold, style épuré',
    preview: (
      <div className="w-full h-full rounded overflow-hidden text-[6px] leading-tight" style={{background:'#f5f4ee'}}>
        <div className="px-3 pt-3 pb-2 flex justify-between items-start">
          <div className="font-black text-[18px] text-gray-900 leading-none tracking-tight">Facture</div>
          <div className="text-right pt-1">
            <div className="text-gray-500 text-[5px]">11 avril 2026</div>
            <div className="font-bold text-[6px] text-gray-900">N° FA-2026-001</div>
          </div>
        </div>
        <div className="border-t border-gray-400 mx-3 mb-2"></div>
        <div className="px-3 mb-2">
          <div className="text-[5px] font-bold text-gray-800 mb-0.5">Facturé à:</div>
          <div className="font-bold text-[7px] text-gray-900">Client X</div>
          <div className="text-gray-500 text-[5px]">123 Rue, Ville</div>
        </div>
        <div className="border-t border-gray-400 mx-3"></div>
        <div className="px-3">
          <div className="flex text-[5px] py-0.5 font-bold border-b-2 border-gray-400">
            <span className="flex-1">Description</span><span className="w-10 text-right">Montant</span>
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="flex text-[5px] py-0.5 border-b border-gray-300">
              <span className="flex-1 text-gray-600">Article {i}</span><span className="w-10 text-right">100 MAD</span>
            </div>
          ))}
          <div className="flex justify-end mt-1 gap-3 text-[5px] font-black text-gray-900 border-t-2 border-gray-900 pt-0.5">
            <span>Total</span><span>300 MAD</span>
          </div>
        </div>
      </div>
    ),
  },
]

export default function InvoiceTemplateSettings() {
  const [selected, setSelected]   = useState('classic')
  const [footer, setFooter]       = useState('Merci pour votre confiance')
  const [payTerms, setPayTerms]   = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    Promise.all([
      api.settingsGet('invoice_template').catch(() => null),
      api.settingsGet('invoice_footer').catch(() => null),
      api.settingsGet('payment_terms').catch(() => null),
    ]).then(([tmpl, ft, pt]: any[]) => {
      if (tmpl) setSelected(tmpl)
      if (ft)   setFooter(ft)
      if (pt)   setPayTerms(pt)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await api.settingsSetMany({
        invoice_template: selected,
        invoice_footer:   footer,
        payment_terms:    payTerms,
      })
      toast('Paramètres sauvegardés')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Modèle de document</h2>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Choisissez le modèle utilisé pour générer vos PDF (factures, devis, bons de livraison...).
      </p>

      <div className="grid grid-cols-2 gap-5">
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => setSelected(t.id)}
            className={`text-left rounded-xl border-2 overflow-hidden transition-all
              ${selected === t.id
                ? 'border-primary shadow-lg shadow-primary/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
            {/* Aperçu */}
            <div className="h-52 bg-gray-50 dark:bg-gray-800 p-3 relative">
              {t.preview}
              {selected === t.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                  ✓
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <div className="font-semibold text-gray-800 dark:text-gray-100">{t.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{t.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Textes personnalisables */}
      <div className="mt-6 space-y-4">
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
