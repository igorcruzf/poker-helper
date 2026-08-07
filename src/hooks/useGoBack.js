import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// Voltar sem armadilha. `to` fixa o destino nas telas onde o histórico engana —
// do acerto, voltar para /mesa/:id só faria a mesa encerrada devolver a pessoa
// para o acerto de novo, num pingue-pongue sem saída.
export function useGoBack(to) {
  const navigate = useNavigate()
  return useCallback(() => {
    if (to) {
      navigate(to)
      return
    }
    // `idx` é o índice do react-router no histórico: 0 significa que esta é a
    // primeira tela da sessão (link aberto de fora) e não há para onde voltar.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }, [navigate, to])
}
