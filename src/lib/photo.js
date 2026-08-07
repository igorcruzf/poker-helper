// A foto — de grupo ou de perfil — mora na própria linha da tabela, como data URI, em vez de um
// link para fora: link quebra quando o site sai do ar e obriga a pessoa a
// hospedar a imagem em algum lugar antes. Em troca, a imagem precisa caber numa
// linha de banco — por isso ela é reduzida e recomprimida aqui, no navegador,
// antes de qualquer coisa ir para o Supabase.

// 640px chega para a capa em tela retina; o avatar tem 46px.
const SIDES = [640, 480, 360, 256]
const QUALITIES = [0.82, 0.72, 0.62, 0.5]

// Teto do texto gravado (o data URI já em base64). O banco tem um CHECK com
// folga em cima disso.
export const MAX_PHOTO_CHARS = 150 * 1024

// Barreira antes de decodificar: uma foto de 50 MB estouraria a memória do
// celular só para ser reduzida em seguida.
const MAX_FILE_BYTES = 25 * 1024 * 1024

// JPEG não tem transparência: sem um fundo, PNG com alpha vira preto puro.
const CANVAS_BG = '#0E211B'

export function formatBytes(chars) {
  const kb = Math.round((Number(chars) || 0) / 1024)
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

export const MAX_PHOTO_LABEL = formatBytes(MAX_PHOTO_CHARS)

// `<img>` e não createImageBitmap: só a tag aplica a orientação do EXIF em
// todos os navegadores, e foto de celular quase sempre vem deitada.
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

function render(img, side, quality) {
  const largest = Math.max(img.naturalWidth, img.naturalHeight) || 1
  const scale = Math.min(1, side / largest)
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

// Devolve o data URI já dentro do limite. Vai apertando a qualidade e, se ainda
// não couber, encolhe a imagem — nessa ordem, para perder nitidez só quando não
// houver outro jeito. Lança 'invalid' | 'huge' | 'decode' | 'too_big'.
export async function fileToPhoto(file) {
  if (!file || !String(file.type || '').startsWith('image/')) throw new Error('invalid')
  if (file.size > MAX_FILE_BYTES) throw new Error('huge')

  const img = await loadImage(file)

  for (const side of SIDES) {
    for (const quality of QUALITIES) {
      const dataUrl = render(img, side, quality)
      if (dataUrl.length <= MAX_PHOTO_CHARS) return dataUrl
    }
  }
  throw new Error('too_big')
}
