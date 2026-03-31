import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Account } from '../../types'

const CLASS_LABELS: Record<number, string> = {
  1: 'Financement permanent',
  2: 'Actif immobilisé',
  3: 'Actif circulant',
  4: 'Passif circulant',
  5: 'Trésorerie',
  6: 'Charges',
  7: 'Produits',
}

const CLASS_COLORS: Record<number, string> = {
  1: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  2: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  3: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  4: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  5: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
  6: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  7: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
}

export default function PlanComptable() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1,2,3,4,5,6,7]))

  useEffect(() => {
    setLoading(true)
    api.getAccounts().then((r: any) => setAccounts(r ?? [])).finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter(a =>
    !search || a.code.includes(search) || a.name.toLowerCase().includes(search.toLowerCase())
  )

  // تجميع حسب الفئة
  const byClass = filtered.reduce((acc, a) => {
    if (!acc[a.class]) acc[a.class] = []
    acc[a.class].push(a)
    return acc
  }, {} as Record<number, Account[]>)

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input max-w-xs" placeholder="Rechercher par code ou nom..." />
        <span className="text-sm text-gray-500">{accounts.length} comptes</span>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {loading && <div className="text-center py-12 text-gray-400">Chargement...</div>}
        {[1,2,3,4,5,6,7].map(cls => {
          const clsAccounts = byClass[cls] ?? []
          if (clsAccounts.length === 0) return null
          const isExpanded = expanded.has(cls)
          return (
            <div key={cls} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(prev => {
                  const next = new Set(prev)
                  next.has(cls) ? next.delete(cls) : next.add(cls)
                  return next
                })}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${CLASS_COLORS[cls]}`}>
                  Classe {cls}
                </span>
                <span className="font-semibold text-sm">{CLASS_LABELS[cls]}</span>
                <span className="text-xs text-gray-400 ml-auto">{clsAccounts.length} comptes</span>
                <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <table className="w-full text-sm border-t border-gray-100 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 w-24">Code</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Intitulé</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500 w-20">Type</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500 w-16">Système</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {clsAccounts.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{a.code}</td>
                        <td className="px-4 py-2">{a.name}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-xs text-gray-500">{a.type}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {a.is_system ? <span className="text-xs text-gray-400">🔒</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
