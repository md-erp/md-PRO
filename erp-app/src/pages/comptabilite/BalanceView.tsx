import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../components/ui/Toast'

export default function BalanceView() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function load() {
    setLoading(true)
    try {
      const result = await api.getBalance({ start_date: startDate || undefined, end_date: endDate || undefined }) as any[]
      setRows(result.filter((r: any) => r.total_debit > 0 || r.total_credit > 0))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n)

  const totalDebit  = rows.reduce((s, r) => s + r.total_debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.total_credit, 0)

  const CLASS_LABELS: Record<number, string> = {
    1: 'Financement permanent', 2: 'Actif immobilisé', 3: 'Actif circulant',
    4: 'Passif circulant', 5: 'Trésorerie', 6: 'Charges', 7: 'Produits',
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-36" type="date" />
        <input value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-36" type="date" />
        <button onClick={load} className="btn-primary">Actualiser</button>
        <button className="btn-secondary btn-sm ml-auto" onClick={async () => {
          try {
            await api.excelExportBalance({ start_date: startDate || undefined, end_date: endDate || undefined })
            toast('✅ Fichier Excel enregistré')
          } catch (e: any) { toast(e.message, 'error') }
        }}>📥 Excel</button>
        <button className="btn-secondary btn-sm">📄 PDF</button>
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-24">Code</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Intitulé</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total Débit</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total Crédit</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Solde Débiteur</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Solde Créditeur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chargement...</td></tr>}
            {rows.map(r => {
              const solde = r.total_debit - r.total_credit
              return (
                <tr key={r.code} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{r.code}</td>
                  <td className="px-4 py-2">
                    <div>{r.name}</div>
                    <div className="text-xs text-gray-400">{CLASS_LABELS[r.class]}</div>
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(r.total_debit)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.total_credit)}</td>
                  <td className="px-4 py-2 text-right font-medium text-green-700">{solde > 0 ? fmt(solde) : ''}</td>
                  <td className="px-4 py-2 text-right font-medium text-red-600">{solde < 0 ? fmt(Math.abs(solde)) : ''}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-primary/5 font-bold border-t-2 border-primary/20 sticky bottom-0">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">TOTAUX</td>
              <td className="px-4 py-3 text-right text-green-700">{fmt(totalDebit)}</td>
              <td className="px-4 py-3 text-right text-red-600">{fmt(totalCredit)}</td>
              <td className="px-4 py-3 text-right text-green-700">
                {totalDebit > totalCredit ? fmt(totalDebit - totalCredit) : ''}
              </td>
              <td className="px-4 py-3 text-right text-red-600">
                {totalCredit > totalDebit ? fmt(totalCredit - totalDebit) : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
