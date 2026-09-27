import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production this would go to a logging service
    console.error('[PauSa ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="bg-brand-surface border border-red-800/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-4xl mb-4">⚠</div>
          <h1 className="text-xl font-bold text-white mb-2">Etwas ist schiefgelaufen</h1>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Ein unerwarteter Fehler ist aufgetreten. Deine Daten sind sicher –
            du kannst die App neu laden oder diesen Bereich zurücksetzen.
          </p>
          {this.state.error && (
            <pre className="text-xs text-red-400 bg-red-900/10 border border-red-800/30 rounded-xl px-4 py-3 text-left overflow-auto mb-6 max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="bg-brand-primary hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Erneut versuchen
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              App neu laden
            </button>
          </div>
        </div>
      </div>
    )
  }
}
