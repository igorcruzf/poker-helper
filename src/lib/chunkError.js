// Um pedaço de tela carregado sob demanda pode simplesmente não chegar: deploy
// novo enquanto a aba estava aberta (o arquivo antigo deixou de existir), rede
// ruim, cache pela metade. O remédio é sempre recarregar, então vale distinguir
// esse caso de um erro de código — que recarregar só esconderia.
export function isChunkError(error) {
  const msg = `${error?.name || ''} ${error?.message || ''}`
  return /chunk|dynamically imported module|failed to fetch dynamically|importing a module script/i.test(msg)
}
