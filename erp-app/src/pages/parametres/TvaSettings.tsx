import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

interface TvaRate {
  id: number
  rate: number
  label: string
  is_active: boolean
}

export default function TvaSettings() {
  const [rates, setRates] = useState<TvaRate[]>([])

  useEffect(() => {
    api.getAccounts({ search: 'TVA' }).then(() => {
      // نقرأ من mock — في الإنتاج نضيف endpoint خاص
      setRates([
        { id: 1, rate: 0,  label: 'Exonéré (0%)',  is_active: true },
        { id: 2, rate: 7,  label: 'TVA 7%',         is_active: true },
        { id: 3, rate: 10, label: 'TVA 10%',        is_active: true },
        { id: 4, rate: 14, label: 'TVA 14%',        is_active: true },
        { id: 5, rate: 20, label: 'TVA 20%',        is_active: true },
      ])
    })
  }, [])

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold mb-6">Taux de TVA</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Taux</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Libellé</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Actif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rates.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-bold text-primary">{r.rate}%</td>
                <td className="px-4 py-3">{r.label}</td>
                <td className="px-4 py-3 text-center">
                  <span className={r.is_active ? 'badge-green' : 'badge-gray'}>
                    {r.is_active ? '✓ Actif' : '✗ Inactif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Les taux TVA sont conformes au Code Général des Impôts marocain (CGI).
      </p>
    </div>
  )
}
