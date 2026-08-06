// Ordem das maos; nome e descricao vivem no dicionario (lib/i18n.js).
export const handRankings = [
  { id: 'royalFlush', example: ['10H', 'JH', 'QH', 'KH', 'AH'] },
  { id: 'straightFlush', example: ['5S', '6S', '7S', '8S', '9S'] },
  { id: 'fourOfAKind', example: ['9H', '9D', '9S', '9C', 'KD'] },
  { id: 'fullHouse', example: ['QH', 'QD', 'QS', '4H', '4C'] },
  { id: 'flush', example: ['2D', '5D', '7D', '10D', 'KD'] },
  { id: 'straight', example: ['4C', '5H', '6S', '7D', '8C'] },
  { id: 'threeOfAKind', example: ['7H', '7D', '7S', 'KC', '2H'] },
  { id: 'twoPair', example: ['JH', 'JS', '3D', '3C', '9H'] },
  { id: 'onePair', example: ['AH', 'AS', '6D', '9C', 'KH'] },
  { id: 'highCard', example: ['AD', '10S', '7H', '4C', '2S'] },
]
