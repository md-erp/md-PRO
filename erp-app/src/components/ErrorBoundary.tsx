import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; info: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' }

  static getDerivedStateFromError(error: Error): State {
    return { error, info: '' }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    this.setState({ info: info.componentStack })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="card max-w-lg w-full p-6 border-red-200 dark:border-red-800">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {this.state.error.message}
            </p>
            <details className="mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                Détails techniques
              </summary>
              <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-32 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {this.state.info}
              </pre>
            </details>
            <button
              onClick={() => this.setState({ error: null, info: '' })}
              className="btn-primary w-full justify-center"
            >
              🔄 Réessayer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
