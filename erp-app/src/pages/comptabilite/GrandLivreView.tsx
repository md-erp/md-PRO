import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Account } from '../../types'

export default function GrandLivreView() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<number>(0)
  const [lines, setLines] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getAccounts().then((r: any) => setAccounts(r ?? []))
  }, [])

  async function load() {
    if (!selectedAccount) return
    setLoading(true)
    try {
      const result = await api.getGrandLivre({ account_id: selectedAccount, start_date: startDate || undefined, end_date: endDate || undefined }) as any[]
      setLines(result)
    } finally { setLoading(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n)
  const totalDebit  = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedAccount} onChange={e => setSelectedAccount(Number(e.target.value))} className="input w-64">
          <option value={0}>— Choisir un compte —</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
        </select>
        <input value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-36" type="date" placeholder="Du" />
        <input value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-36" type="date" placeholder="Au" />
        <button onClick={load} disabled={!selectedAccount} className="btn-primary">Afficher</button>
      </div>

      {lines.length > 0 && (
        <div className="card flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Référence</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Débit</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Crédit</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {lines.map((l, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 text-gray-500 text-xs">{new Date(l.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2 font-mono text-xs text-primary">{l.reference}</td>
                  <td className="px-4 py-2 text-gray-600">{l.description}</td>
                  <td className="px-4 py-2 text-right text-green-700 font-medium">{l.debit > 0 ? fmt(l.debit) : ''}</td>
                  <td className="px-4 py-2 text-right text-red-600 font-medium">{l.credit > 0 ? fmt(l.credit) : ''}</td>
                  <td className={`px-4 py-2 text-right font-bold ${l.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {fmt(Math.abs(l.balance))} {l.balance >= 0 ? 'D' : 'C'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold border-t-2 border-gray-200">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">Totaux</td>
                <td className="px-4 py-3 text-right text-green-700">{fmt(totalDebit)}</td>
                <td className="px-4 py-3 text-right text-red-600">{fmt(totalCredit)}</td>
                <td className={`px-4 py-3 text-right ${totalDebit - totalCredit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(Math.abs(totalDebit - totalCredit))} {totalDebit - totalCredit >= 0 ? 'D' : 'C'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!loading && lines.length === 0 && selectedAccount > 0 && (
        <div className="card p-12 text-center text-gray-400">Aucun mouvement pour ce compte</div>
      )}
    </div>
  )
}
