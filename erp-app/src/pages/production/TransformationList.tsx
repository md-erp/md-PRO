import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'
import Modal from '../../components/ui/Modal'
import TransformationForm from './TransformationForm'

export default function TransformationList() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await api.getTransformations() as any[]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n)

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Nouvelle Transformation</button>
        <button onClick={load} className="btn-secondary btn-sm">↻</button>
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Matière première</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Quantité entrée</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Coût/unité</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Coût total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Chargement...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="text-center py-16">
                <div className="text-4xl mb-3">🔄</div>
                <div className="text-gray-500">Aucune transformation</div>
              </td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 text-gray-500">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.material_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{r.material_code}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{r.input_quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt(r.cost_per_unit)} MAD</td>
                <td className="px-4 py-3 text-right font-semibold">{fmt(r.total_cost)} MAD</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle Transformation" size="lg">
        <TransformationForm onSaved={() => { setModalOpen(false); load() }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
