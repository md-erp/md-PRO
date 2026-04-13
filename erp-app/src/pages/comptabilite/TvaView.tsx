import { useState } from 'react'
import { api } from '../../lib/api'

export default function TvaView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function load() {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const result = await api.getTvaDeclaration({ start_date: startDate, end_date: endDate })
      setData(result)
    } finally { setLoading(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n)

  return (
    <div className="flex flex-col gap-4">
      {/* Période */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500">Période:</label>
        <input value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-36" type="date" />
        <span className="text-gray-400">→</span>
        <input value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-36" type="date" />
        <button onClick={load} disabled={!startDate || !endDate} className="btn-primary">
          Calculer
        </button>
        {data && <button className="btn-secondary btn-sm ml-auto">📄 Exporter</button>}
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Calcul en cours...</div>}

      {data && (
        <div className="grid grid-cols-2 gap-4 flex-1 overflow-auto">
          {/* TVA Facturée */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              TVA Facturée (Collectée)
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="py-2 text-left font-medium text-gray-500">Taux</th>
                  <th className="py-2 text-right font-medium text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody>
                {(data.collectee ?? []).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2 text-gray-600">{r.tva_rate}</td>
                    <td className="py-2 text-right font-medium">{fmt(r.amount)} MAD</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right text-red-600">{fmt(data.totalCollectee ?? 0)} MAD</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* TVA Récupérable */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              TVA Récupérable (Déductible)
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="py-2 text-left font-medium text-gray-500">Taux</th>
                  <th className="py-2 text-right font-medium text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody>
                {(data.recuperable ?? []).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-2 text-gray-600">{r.tva_rate}</td>
                    <td className="py-2 text-right font-medium">{fmt(r.amount)} MAD</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right text-green-700">{fmt(data.totalRecuperable ?? 0)} MAD</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Résultat TVA */}
          <div className="col-span-2">
            <div className={`card p-6 text-center ${(data.tvaDue ?? 0) >= 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-green-200 bg-green-50 dark:bg-green-900/10'}`}>
              <div className="text-sm text-gray-500 mb-1">
                {(data.tvaDue ?? 0) >= 0 ? 'TVA due à payer' : 'Crédit de TVA'}
              </div>
              <div className={`text-3xl font-bold ${(data.tvaDue ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(Math.abs(data.tvaDue ?? 0))} MAD
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {fmt(data.totalCollectee ?? 0)} − {fmt(data.totalRecuperable ?? 0)} = {fmt(data.tvaDue ?? 0)} MAD
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🧾</div>
          <div>Sélectionnez une période pour calculer la TVA</div>
        </div>
      )}
    </div>
  )
}
