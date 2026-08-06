import { useState } from 'react'
import { handRankings } from '../data/handRankings.js'
import { useI18n } from '../hooks/useI18n.js'

function cardUrl(code) {
  return `${import.meta.env.BASE_URL}cards/deck/${code}.png`
}

export default function HandRankingScreen({ onBack }) {
  const { t } = useI18n()
  const [compact, setCompact] = useState(false)

  return (
    <div className="rail screen-enter">
      <div className="card">
        <div className="ranking-header">
          <button className="back-link" onClick={onBack}>{t('common.back')}</button>
          <button
            className="view-toggle"
            onClick={() => setCompact((c) => !c)}
            title={compact ? t('ranking.detailedTitle') : t('ranking.compactTitle')}
          >
            {compact ? t('ranking.detailed') : t('ranking.compact')}
          </button>
        </div>
        <div className={`ranking-list${compact ? ' compact' : ''}`}>
          {handRankings.map((hand, i) => (
            <div className="ranking-item" key={hand.id}>
              <div className="ranking-rank">{i + 1}</div>
              <div className="ranking-text">
                <div className="ranking-name">{t('hands.' + hand.id + '.name')}</div>
                <div className="ranking-desc">{t('hands.' + hand.id + '.desc')}</div>
                {hand.example && (
                  <div className="ranking-cards">
                    {hand.example.map((code, j) => (
                      <img
                        key={code}
                        className="mini-card"
                        src={cardUrl(code)}
                        alt={code}
                        loading="lazy"
                        style={{ '--i': j }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
