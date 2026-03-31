interface Action {
  label: string
  icon: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  selectedCount: number
  actions: Action[]
  onClear: () => void
}

export default function BatchToolbar({ selectedCount, actions, onClear }: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40
      bg-primary text-white rounded-xl shadow-2xl px-5 py-3
      flex items-center gap-4 animate-in slide-in-from-bottom-4">
      <span className="text-sm font-medium">
        {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
      </span>
      <div className="w-px h-5 bg-white/20" />
      <div className="flex gap-2">
        {actions.map(a => (
          <button key={a.label} onClick={a.onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${a.danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/10 hover:bg-white/20'}`}>
            <span>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
      <button onClick={onClear} className="text-white/60 hover:text-white text-lg ml-2">✕</button>
    </div>
  )
}
