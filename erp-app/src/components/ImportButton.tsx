import { useState } from 'react'
import { api } from '../lib/api'
import { toast } from './ui/Toast'
import Modal from './ui/Modal'

interface Props {
  type: 'clients' | 'suppliers' | 'products'
  onImported: () => void
}

const LABELS = { clients: 'Clients', suppliers: 'Fournisseurs', products: 'Produits' }

const COLUMNS: Record<string, { col: string; required: boolean; example: string }[]> = {
  clients: [
    { col: 'Nom',       required: true,  example: 'Atlas SARL' },
    { col: 'Adresse',   required: false, example: '123 Rue Hassan II, Casa' },
    { col: 'Email',     required: false, example: 'contact@atlas.ma' },
    { col: 'Téléphone', required: false, example: '+212 5 22 00 00 00' },
    { col: 'ICE',       required: false, example: '001234567000012' },
    { col: 'IF',        required: false, example: '12345678' },
    { col: 'RC',        required: false, example: 'RC12345' },
  ],
  suppliers: [
    { col: 'Nom',       required: true,  example: 'Fournisseur SARL' },
    { col: 'Adresse',   required: false, example: 'Zone Industrielle, Rabat' },
    { col: 'Email',     required: false, example: 'info@fournisseur.ma' },
    { col: 'Téléphone', required: false, example: '+212 5 37 00 00 00' },
    { col: 'ICE',       required: false, example: '009876543000001' },
    { col: 'IF',        required: false, example: '87654321' },
    { col: 'RC',        required: false, example: 'RC98765' },
  ],
  products: [
    { col: 'Code',        required: true,  example: 'ART001' },
    { col: 'Désignation', required: true,  example: 'Produit Exemple' },
    { col: 'Unité',       required: false, example: 'unité / kg / m' },
    { col: 'Type',        required: false, example: 'finished / raw / semi_finished' },
    { col: 'Prix vente',  required: false, example: '100.00' },
    { col: 'Stock min',   required: false, example: '10' },
    { col: 'TVA',         required: false, example: '20 (ou 0, 7, 10, 14)' },
  ],
}

export default function ImportButton({ type, onImported }: Props) {
  const [showGuide, setShowGuide] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleDownloadTemplate() {
    try {
      await api.importDownloadTemplate(type)
      toast('Template téléchargé dans Téléchargements')
    } catch (e: any) { toast(e.message, 'error') }
  }

  async function handleImport() {
    setLoading(true)
    try {
      const filePath = await api.importSelectFile() as string | null
      if (!filePath) { setLoading(false); return }

      let r: any
      if (type === 'clients')   r = await api.importClients({ filePath })
      if (type === 'suppliers') r = await api.importSuppliers({ filePath })
      if (type === 'products')  r = await api.importProducts({ filePath })

      setShowGuide(false)
      setResult(r)

      if (r.success > 0) {
        toast(`${r.success} ${LABELS[type].toLowerCase()} importé(s)`)
        onImported()
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const cols = COLUMNS[type]

  return (
    <>
      <button onClick={() => setShowGuide(true)} className="btn-secondary btn-sm">
        📥 Importer
      </button>

      {/* Guide d'import */}
      <Modal open={showGuide} onClose={() => setShowGuide(false)}
        title={`Importer des ${LABELS[type]}`} size="lg">
        <div className="space-y-5">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
            <div className="font-semibold mb-2">📋 Instructions</div>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Le fichier doit être au format <strong>Excel (.xlsx)</strong> ou <strong>CSV</strong></li>
              <li>La <strong>première ligne</strong> doit contenir les en-têtes de colonnes</li>
              <li>Les colonnes marquées <span className="text-red-500 font-bold">*</span> sont obligatoires</li>
              <li>Les doublons sont ignorés automatiquement</li>
              <li>Téléchargez le template pour un fichier prêt à remplir</li>
            </ul>
          </div>

          {/* Colonnes attendues */}
          <div>
            <div className="text-sm font-semibold mb-2">Colonnes attendues</div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Colonne</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Requis</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Exemple</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {cols.map(c => (
                    <tr key={c.col}>
                      <td className="px-3 py-2 font-medium">
                        {c.col}
                        {c.required && <span className="text-red-500 ml-1">*</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c.required
                          ? <span className="text-red-500 font-bold">Oui</span>
                          : <span className="text-gray-400">Non</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{c.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleDownloadTemplate}
              className="btn-secondary flex-1 justify-center">
              📋 Télécharger le template Excel
            </button>
            <button onClick={handleImport} disabled={loading}
              className="btn-primary flex-1 justify-center">
              {loading ? 'Importation...' : '📂 Choisir un fichier et importer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Résultat */}
      {result && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-semibold text-lg mb-4">Résultat de l'import</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 text-sm">
                <span className="text-gray-500">Total lignes traitées</span>
                <span className="font-medium">{result.total}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 text-sm">
                <span className="text-green-600">✅ Importés avec succès</span>
                <span className="font-bold text-green-600 text-base">{result.success}</span>
              </div>
              {result.errors.length > 0 && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-red-500">❌ Erreurs</span>
                  <span className="font-bold text-red-500 text-base">{result.errors.length}</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-48 overflow-y-auto mb-4">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
                  ⚠️ Détail des erreurs ({result.errors.length})
                </div>
                {result.errors.map((e: any, i: number) => (
                  <div key={i} className="flex gap-2 text-xs text-red-600 dark:text-red-400 py-1 border-b border-red-100 dark:border-red-900/30 last:border-0">
                    {e.row > 0 && (
                      <span className="shrink-0 font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300">
                        Ligne {e.row}
                      </span>
                    )}
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            )}

            {result.success === 0 && result.errors.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 dark:text-orange-400 mb-3">
                💡 <strong>Conseils:</strong> Vérifiez que les en-têtes correspondent exactement aux colonnes attendues.
                Téléchargez le template pour un exemple correct.
              </div>
            )}

            <button onClick={() => setResult(null)} className="btn-primary w-full justify-center">
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
