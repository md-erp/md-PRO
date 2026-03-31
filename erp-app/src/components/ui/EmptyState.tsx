interface Props {
  icon: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-semibold text-gray-600 dark:text-gray-300">{title}</div>
      {description && <div className="text-sm text-gray-400 mt-1 max-w-xs">{description}</div>}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-4">
          {action.label}
        </button>
      )}
    </div>
  )
}
