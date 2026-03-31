import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAppStore } from '../../store/app.store'

interface Stats {
  invoices_count: number
  invoices_total: number
  unpaid_total: number
  clients_count: number
  products_low_stock: number
  cheques_due_soon: number
}

export default function DashboardPage() {
  const { config } = useAppStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentDocs, setRecentDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [docs, clients, products, , notifications] = await Promise.all([
          api.getDocuments({ type: 'invoice', limit: 5 }) as Promise<any>,
          api.getClients({ limit: 1 }) as Promise<any>,
          api.getProducts({ limit: 500 }) as Promise<any>,
          Promise.resolve([]), // placeholder
          api.getNotifications() as Promise<any[]>,
        ])

        const allDocs = await api.getDocuments({ type: 'invoice', limit: 1000 }) as any
        const invoices = allDocs.rows ?? []

        const unpaid = invoices.filter((d: any) => d.status === 'confirmed' || d.status === 'partial')
        const unpaid_total = unpaid.reduce((s: number, d: any) => s + d.total_ttc, 0)

        const lowStock = (products.rows ?? []).filter((p: any) => p.stock_quantity <= p.min_stock && p.min_stock > 0)
        const chequesNotifs = (notifications ?? []).filter((n: any) => n.type === 'cheque')

        setStats({
          invoices_count:     invoices.length,
          invoices_total:     invoices.reduce((s: number, d: any) => s + d.total_ttc, 0),
          unpaid_total,
          clients_count:      clients.total ?? 0,
          products_low_stock: lowStock.length,
          cheques_due_soon:   chequesNotifs.length,
        })

        setRecentDocs((docs.rows ?? []).slice(0, 5))
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n ?? 0)
  const greeting = today.getHours() < 12 ? 'Bonjour' : today.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'

  const STATUS_BADGE: Record<string, string> = {
    draft: 'badge-gray', confirmed: 'badge-blue', partial: 'badge-orange',
    paid: 'badge-green', cancelled: 'badge-red',
  }
  const STATUS_LABEL: Record<string, string> = {
    draft: 'Brouillon', confirmed: 'Confirmée', partial: 'Partiel',
    paid: 'Payée', cancelled: 'Annulée',
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {greeting}, {config?.company_name ?? 'Bienvenue'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Facturé',
              value: fmt(stats?.invoices_total ?? 0) + ' MAD',
              sub: `${stats?.invoices_count ?? 0} facture(s)`,
              icon: '💰', color: 'text-primary', bg: 'bg-primary/5',
            },
            {
              label: 'Impayé',
              value: fmt(stats?.unpaid_total ?? 0) + ' MAD',
              sub: 'À encaisser',
              icon: '⏳', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/10',
              alert: (stats?.unpaid_total ?? 0) > 0,
            },
            {
              label: 'Clients',
              value: String(stats?.clients_count ?? 0),
              sub: 'Clients actifs',
              icon: '👥', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10',
            },
            {
              label: 'Alertes',
              value: String((stats?.products_low_stock ?? 0) + (stats?.cheques_due_soon ?? 0)),
              sub: `${stats?.products_low_stock ?? 0} stock bas · ${stats?.cheques_due_soon ?? 0} chèques`,
              icon: '🔔', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10',
              alert: ((stats?.products_low_stock ?? 0) + (stats?.cheques_due_soon ?? 0)) > 0,
            },
          ].map(card => (
            <div key={card.label} className={`card p-5 ${card.bg} ${card.alert ? 'border-orange-200 dark:border-orange-800' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{card.label}</span>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières factures */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Dernières factures</h3>
            <span className="text-xs text-gray-400">5 dernières</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentDocs.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">Aucune facture</div>
            )}
            {recentDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <div>
                  <div className="font-mono text-xs font-bold text-primary">{doc.number}</div>
                  <div className="text-sm text-gray-600">{doc.party_name ?? '—'}</div>
                  <div className="text-xs text-gray-400">{new Date(doc.date).toLocaleDateString('fr-FR')}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{fmt(doc.total_ttc)} MAD</div>
                  <span className={`text-xs ${STATUS_BADGE[doc.status] ?? 'badge-gray'}`}>
                    {STATUS_LABEL[doc.status] ?? doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Raccourcis */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Actions rapides</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { icon: '📄', label: 'Nouvelle Facture',    action: 'documents' },
              { icon: '👤', label: 'Nouveau Client',      action: 'parties' },
              { icon: '📦', label: 'Nouveau Produit',     action: 'stock' },
              { icon: '🛒', label: 'Bon de Commande',     action: 'achats' },
              { icon: '📊', label: 'Balance Comptable',   action: 'comptabilite' },
              { icon: '💾', label: 'Sauvegarder',         action: 'backup' },
            ].map(item => (
              <button key={item.label}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-primary">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
