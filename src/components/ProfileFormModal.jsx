import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { fileToPhoto, formatBytes, MAX_PHOTO_LABEL } from '../lib/photo.js'
import { profileName } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

export default function ProfileFormModal({ open, profile, busy, onCancel, onConfirm }) {
  const { t } = useI18n()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [photo, setPhoto] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [working, setWorking] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setFirstName(profile?.first_name || '')
    setLastName(profile?.last_name || '')
    setPhoto(profile?.photo || '')
    setPixKey(profile?.pix_key || '')
    setPhotoError('')
    if (fileRef.current) fileRef.current.value = ''
  }, [open, profile])

  if (!open) return null

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setWorking(true)
    setPhotoError('')
    try {
      setPhoto(await fileToPhoto(file))
    } catch (err) {
      const known = ['invalid', 'huge', 'decode', 'too_big']
      const reason = known.includes(err?.message) ? err.message : 'decode'
      setPhotoError(t(`groups.photoError.${reason}`, { size: MAX_PHOTO_LABEL }))
    }
    setWorking(false)
  }

  const preview = profileName({ first_name: firstName, last_name: lastName })
  const disabled = !firstName.trim() || busy || working

  return (
    <div className="overlay">
      <div className="modal">
        <p className="question">{t('profile.editTitle')}</p>

        <div className="profile-photo-row">
          <Avatar photo={photo} name={preview} size="xl" />
        </div>

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
            : t('profile.photoHint', { size: MAX_PHOTO_LABEL })}
        </p>

        {photoError && <div className="auth-error">{photoError}</div>}

        <label className="auth-field">
          <span>{t('profile.firstName')}</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            autoFocus
          />
        </label>

        <label className="auth-field">
          <span>{t('profile.lastName')}</span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </label>

        <label className="auth-field">
          <span>{t('profile.pixKey')}</span>
          <input
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder={t('profile.pixPlaceholder')}
            maxLength={140}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <small className="field-hint">{t('profile.pixHint')}</small>
        </label>

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div
            className={`round-action confirm${disabled ? ' disabled' : ''}`}
            onClick={() => !disabled && onConfirm({ firstName, lastName, photo, pixKey })}
          >✓</div>
        </div>
      </div>
    </div>
  )
}
