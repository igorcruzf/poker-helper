export const handRankings = [
  {
    name: 'Royal Flush',
    desc: 'As cinco maiores cartas do mesmo naipe, do 10 ao Ás. A mão mais forte do poker.',
    example: ['10H', 'JH', 'QH', 'KH', 'AH'],
  },
  {
    name: 'Straight Flush',
    desc: 'Cinco cartas em sequência, todas do mesmo naipe.',
    example: ['5S', '6S', '7S', '8S', '9S'],
  },
  {
    name: 'Quadra',
    desc: 'Quatro cartas de mesmo valor, mais uma carta qualquer.',
    example: ['9H', '9D', '9S', '9C', 'KD'],
  },
  {
    name: 'Full House',
    desc: 'Uma trinca mais um par.',
    example: ['QH', 'QD', 'QS', '4H', '4C'],
  },
  {
    name: 'Flush',
    desc: 'Cinco cartas do mesmo naipe, fora de sequência.',
    example: ['2D', '5D', '7D', '10D', 'KD'],
  },
  {
    name: 'Sequência (Straight)',
    desc: 'Cinco cartas em sequência, de naipes diferentes.',
    example: ['4C', '5H', '6S', '7D', '8C'],
  },
  {
    name: 'Trinca',
    desc: 'Três cartas de mesmo valor, mais duas cartas quaisquer.',
    example: ['7H', '7D', '7S', 'KC', '2H'],
  },
  {
    name: 'Dois Pares',
    desc: 'Dois pares de valores diferentes, mais uma carta qualquer.',
    example: ['JH', 'JS', '3D', '3C', '9H'],
  },
  {
    name: 'Um Par',
    desc: 'Duas cartas de mesmo valor, mais três cartas quaisquer.',
    example: ['AH', 'AS', '6D', '9C', 'KH'],
  },
  {
    name: 'Carta Alta',
    desc: 'Quando ninguém forma nenhuma das mãos acima, vence a maior carta.',
    example: ['AD', '10S', '7H', '4C', '2S'],
  },
]
