import { Zap } from 'lucide-react'

function HighlightCard() {
  return (
    <section className="highlight-card">
      <div className="highlight-header">
        <span>
          <Zap size={17} />
          DESTAQUE DO MOMENTO
        </span>

        <span className="live-badge">
          AO VIVO
        </span>
      </div>

      <div className="highlight-content">
        <span className="highlight-label">
          RESPOSTA À CRISE
        </span>

        <h2>Delegado A</h2>

        <p>
          Respondeu à crise atual com uma ação estratégica
          e apresentou uma nova ordem ao gabinete.
        </p>

        <strong>+8.0 impacto</strong>
      </div>
    </section>
  )
}

export default HighlightCard