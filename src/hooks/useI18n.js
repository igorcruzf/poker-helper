import { useCallback, useEffect, useState } from 'react'
import { getLocale, onLocaleChange, readLocalePref, setLocalePref, translate } from '../lib/i18n.js'

// Idioma da interface. A preferência pode ser 'auto' (segue o aparelho) ou um
// código fixo; `locale` é o resultado já resolvido.
export function useI18n() {
  const [pref, setPref] = useState(readLocalePref)

  useEffect(() => onLocaleChange(setPref), [])

  const locale = getLocale()
  const t = useCallback((key, params) => translate(locale, key, params), [locale])

  return { t, locale, pref, setLocale: setLocalePref }
}
