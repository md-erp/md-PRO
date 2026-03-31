import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'
import type { JournalEntry } from '../../types'

export default function JournalView() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.getJournalEntries({ start_date: startDate || undefined, end_date: endDate || undefined }) as JournalEntry[]
      setEntries(result)
    } finally { setLoading(false) }
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n)

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Du</label>
          <input value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-36" type="date" />
          <label className="text-sm text-gray-500">au</label>
          <input value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-36" type="date" />
        </div>
        <button onClick={load} className="btn-secondary btn-sm">↻ Actualiser</button>
        <span className="text-sm text-gray-500 ml-auto">{entries.length} écriture(s)</span>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {loading && <div className="text-center py-12 text-gray-400">Chargement...</div>}
        {!loading && entries.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📒</div>
            <div>Aucune écriture comptable</div>
            <div className="text-xs mt-1">Les écritures sont générées automatiquement lors de la confirmation des documents</div>
          </div>
        )}
        {entries.map(e => (
          <div key={e.id} className="card overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left">
              <span className="text-xs text-gray-400 w-20 shrink-0">
                {new Date(e.date).toLocaleDateString('fr-FR')}
              </span>
              <span className="font-mono text-xs text-primary w-28 shrink-0">{e.reference}</span>
              <span className="text-sm flex-1">{e.description}</span>
              {e.is_auto && <span className="badge-blue text-xs">Auto</span>}
              <span className="text-gray-400 text-xs">{expanded === e.id ? '▲' : '▼'}</span>
            </button>
            {expanded === e.id && e.lines && (
              <table className="w-full text-xs border-t border-gray-100 dark:border-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Compte</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Intitulé</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Débit</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {e.lines.map((l, i) => (
                    <tr key={i} className={l.debit > 0 ? 'bg-green-50/30' : 'bg-red-50/30'}>
                      <td className="px-4 py-2 font-mono font-bold text-primary">{l.account_code}</td>
                      <td className="px-4 py-2 text-gray-600">{l.account_name}</td>
                      <td className="px-4 py-2 text-right font-semibold text-green-700">
                        {l.debit > 0 ? fmt(l.debit) : ''}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-red-600">
                        {l.credit > 0 ? fmt(l.credit) : ''}
                      </td>
                    </tr>
                  ))}
                  {/* Total */}
                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-bold">
                    <td colSpan={2} className="px-4 py-2 text-right text-gray-500">Total</td>
                    <td className="px-4 py-2 text-right text-green-700">
                      {fmt(e.lines.reduce((s, l) => s + l.debit, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {fmt(e.lines.reduce((s, l) => s + l.credit, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
