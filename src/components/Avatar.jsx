import { useState, useEffect } from 'react'
import { initials } from '../utils.js'

// Foto do perfil, ou as iniciais quando não houver — e também quando a foto não
// carregar, para nunca sobrar um quadrado vazio no lugar da pessoa.
export default function Avatar({ photo, name, size = 'md', className = '' }) {
  const [broken, setBroken] = useState(false)

  useEffect(() => setBroken(false), [photo])

  const classes = `avatar avatar-${size}${className ? ` ${className}` : ''}`

  if (!photo || broken) {
    return <span className={`${classes} avatar-initials`} aria-hidden="true">{initials(name)}</span>
  }

  return <img className={classes} src={photo} alt="" onError={() => setBroken(true)} />
}
