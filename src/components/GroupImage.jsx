import { DEFAULT_GROUP_IMAGE, groupImage } from '../utils.js'

// A foto do grupo é uma URL que o host digita, então ela pode simplesmente não
// carregar. Nesse caso vale a imagem que vem no app, em vez do ícone de figura
// quebrada. `onerror = null` antes de trocar corta o laço se nem a padrão vier.
export default function GroupImage({ group, className }) {
  return (
    <img
      className={className}
      src={groupImage(group)}
      alt=""
      onError={(e) => {
        e.currentTarget.onerror = null
        e.currentTarget.src = DEFAULT_GROUP_IMAGE
      }}
    />
  )
}
