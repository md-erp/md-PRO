import { useAppStore } from '../../store/app.store'

export default function NetworkSettings() {
  const { config } = useAppStore()

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold mb-6">Configuration réseau</h2>
      <div className="card p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Mode de fonctionnement</span>
          <span className={`badge ${config?.mode === 'standalone' ? 'badge-green' : 'badge-blue'}`}>
            {config?.mode === 'standalone' ? '🖥️ Poste unique' :
             config?.mode === 'master'     ? '🌐 Serveur réseau' : '💻 Client réseau'}
          </span>
        </div>
        {config?.mode !== 'standalone' && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Serveur</span>
            <span className="font-mono text-sm">{config?.server_ip}:{config?.server_port}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Pour modifier le mode réseau, relancez le wizard de configuration depuis les paramètres avancés.
      </p>
    </div>
  )
}
