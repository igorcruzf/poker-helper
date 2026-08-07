import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

let mockUser = null
let pendingQuery = null

vi.mock('./useAuth.jsx', () => ({ useAuth: () => ({ user: mockUser }) }))
vi.mock('../lib/syncQueue.js', () => ({ reportResult: vi.fn() }))
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => pendingQuery }),
      }),
    }),
  },
}))

const { MyProfileProvider, useMyProfile } = await import('./useMyProfile.jsx')

// Mostra na tela o que a porta do App lê, para as asserções serem sobre o que
// de fato decide o desvio.
function Probe() {
  const { loading, needsSetup } = useMyProfile()
  return <span data-testid="gate">{`${loading ? 'carregando' : 'pronto'}|${needsSetup ? 'desvia' : 'segue'}`}</span>
}

const gate = () => screen.getByTestId('gate').textContent

function renderGate() {
  render(<MyProfileProvider><Probe /></MyProfileProvider>)
}

// A busca fica pendurada até `resolve` ser chamado, que é como se reproduz o
// quadro entre "o usuário chegou" e "o perfil voltou".
function deferQuery() {
  let resolve
  pendingQuery = new Promise((r) => { resolve = r })
  return async (value) => {
    await act(async () => {
      resolve(value)
      await pendingQuery
    })
  }
}

beforeEach(() => {
  mockUser = null
  localStorage.clear()
})
afterEach(() => vi.clearAllMocks())

describe('MyProfileProvider', () => {
  it('sem sessão não carrega nem desvia', async () => {
    pendingQuery = Promise.resolve({ data: null, error: null })
    await act(async () => renderGate())
    expect(gate()).toBe('pronto|segue')
  })

  // A regressão: no F5 a sessão chega antes da busca do perfil começar. Se
  // `loading` já estiver falso nesse quadro, a porta lê "perfil sem nome" e
  // joga a pessoa no formulário de cadastro sozinha.
  it('continua carregando enquanto a busca do perfil não volta', async () => {
    mockUser = { id: 'u1' }
    const finish = deferQuery()
    await act(async () => renderGate())
    expect(gate()).toBe('carregando|segue')

    await finish({ data: { id: 'u1', first_name: 'Igor' }, error: null })
    expect(gate()).toBe('pronto|segue')
  })

  it('desvia quando o perfil existe e está sem nome', async () => {
    mockUser = { id: 'u1' }
    const finish = deferQuery()
    await act(async () => renderGate())
    await finish({ data: { id: 'u1', first_name: null }, error: null })
    expect(gate()).toBe('pronto|desvia')
  })

  it('não insiste depois de já ter oferecido uma vez', async () => {
    mockUser = { id: 'u1' }
    localStorage.setItem('poker-profile-setup-offered:u1', '1')
    const finish = deferQuery()
    await act(async () => renderGate())
    await finish({ data: { id: 'u1', first_name: null }, error: null })
    expect(gate()).toBe('pronto|segue')
  })

  // Sem conexão o perfil volta nulo; empurrar para o cadastro nesse caso faria
  // a pessoa "perder" o nome que já tinha.
  it('erro de leitura não vira formulário de cadastro', async () => {
    mockUser = { id: 'u1' }
    const finish = deferQuery()
    await act(async () => renderGate())
    await finish({ data: null, error: { message: 'Failed to fetch' } })
    expect(gate()).toBe('pronto|segue')
  })
})
