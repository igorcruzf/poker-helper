import { useEffect, useRef, useState } from 'react'
import GroupImage from './GroupImage.jsx'
import { fileToPhoto, formatBytes, MAX_PHOTO_LABEL } from '../lib/photo.js'
import { useI18n } from '../hooks/useI18n.js'

// Serve para criar e para editar: a diferença é só o `group` vir preenchido.
export default function GroupFormModal({ open, group, busy, onCancel, onConfirm }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [working, setWorking] = useState(false)
  const fileRef = useRef(null)
  const editing = !!group

  useEffect(() => {
    if (!open) return
    setName(group?.name || '')
    setPhoto(group?.image_url || '')
    setPhotoError('')
    if (fileRef.current) fileRef.current.value = ''
  }, [open, group])

  if (!open) return null

  async function handleFile(e) {
    const file = e.target.files?.[0]
    // Zera já: escolher o mesmo arquivo de novo tem que disparar o onChange.
    e.target.value = ''
    if (!file) return

    setWorking(true)
    setPhotoError('')
    try {
      setPhoto(await fileToPhoto(file))
    } catch (err) {
      // Qualquer coisa fora dos motivos previstos (canvas indisponível, imagem
      // corrompida) cai em "não consegui abrir" em vez de mostrar a chave crua.
      const known = ['invalid', 'huge', 'decode', 'too_big']
      const reason = known.includes(err?.message) ? err.message : 'decode'
      setPhotoError(t(`groups.photoError.${reason}`, { size: MAX_PHOTO_LABEL }))
    }
    setWorking(false)
  }

  const disabled = !name.trim() || busy || working

  return (
    <div className="overlay">
      <div className="modal">
        <p className="question">{editing ? t('groups.editTitle') : t('groups.createTitle')}</p>

        <GroupImage className="group-cover" group={{ image_url: photo }} />

        <div className="group-buttons">
          <button
            type="button"
            className="roster-add-btn"
            onClick={() => fileRef.current?.click()}
            disabled={working}
          >
            {working ? t('groups.photoWorking') : photo ? t('groups.photoChange') : t('groups.photoPick')}
          </button>
          {photo && (
            <button type="button" className="roster-add-btn" onClick={() => setPhoto('')}>
              {t('groups.photoRemove')}
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="file-input-hidden"
          onChange={handleFile}
        />

        <p className="field-hint photo-hint">
          {photo
            ? t('groups.photoSaved', { size: formatBytes(photo.length) })
            : t('groups.photoHint', { size: MAX_PHOTO_LABEL })}
        </p>

        {photoError && <div className="auth-error">{photoError}</div>}

        <label className="auth-field">
          <span>{t('groups.nameLabel')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('groups.namePlaceholder')}
            autoFocus={!editing}
          />
        </label>

        {!editing && <p className="modal-hint">{t('groups.createHint')}</p>}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div
            className={`round-action confirm${disabled ? ' disabled' : ''}`}
            onClick={() => !disabled && onConfirm({ name: name.trim(), photo })}
          >✓</div>
        </div>
      </div>
    </div>
  )
}
