import { Component } from 'react'
import { getLocale, translate } from '../lib/i18n.js'
import { isChunkError } from '../lib/chunkError.js'

const RELOAD_KEY = 'poker-chunk-reload'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Erro não tratado na tela', error)
    // Erro de código não se resolve recarregando; recarregar só esconderia.
    if (!isChunkError(error)) return

    // Uma recarga por sessão: se o arquivo continuar faltando, insistir viraria
    // laço e a pessoa nunca veria o motivo.
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return
      sessionStorage.setItem(RELOAD_KEY, '1')
    } catch {
      /* bloqueado: segue e recarrega uma vez */
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    const t = (key) => translate(getLocale(), key)

    return (
      <div className="app-shell">
        <div className="app">
          <div className="rail">
            <div className="card screen-status">
              <p className="screen-status-text">{t('status.crashed')}</p>
              <p className="screen-status-detail">{String(this.state.error?.message || this.state.error)}</p>
              <button className="roster-add-btn" onClick={() => window.location.reload()}>
                {t('status.reload')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
