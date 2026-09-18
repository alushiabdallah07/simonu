import { ArrowDown, ArrowUp, Minus, Trophy } from 'lucide-react'

interface Delegate {
  position: number
  name: string
  country: string
  score: number
  movement: number
}

const delegates: Delegate[] = [
  {
    position: 1,
    name: 'Delegado A',
    country: 'Estados Unidos',
    score: 87.4,
    movement: 4.2,
  },
  {
    position: 2,
    name: 'Delegado B',
    country: 'Irã',
    score: 84.8,
    movement: -1.1,
  },
  {
    position: 3,
    name: 'Delegado C',
    country: 'Rússia',
    score: 82.6,
    movement: 6.7,
  },
  {
    position: 4,
    name: 'Delegado D',
    country: 'China',
    score: 79.3,
    movement: 0,
  },
  {
    position: 5,
    name: 'Delegado E',
    country: 'França',
    score: 77.9,
    movement: 2.4,
  },
]

function Ranking() {
  return (
    <section className="ranking-card">
      <div className="section-header">
        <div>
          <span className="section-label">COMPETIÇÃO</span>
          <h2>Ranking ao vivo</h2>
        </div>

        <Trophy size={24} />
      </div>

      <div className="ranking-list">
        {delegates.map((delegate) => {
          const isUp = delegate.movement > 0
          const isDown = delegate.movement < 0

          return (
            <div
              className="ranking-row"
              key={delegate.position}
            >
              <span className="ranking-position">
                {delegate.position}
              </span>

              <div className="delegate-info">
                <strong>{delegate.name}</strong>
                <span>{delegate.country}</span>
              </div>

              <strong className="delegate-score">
                {delegate.score.toFixed(1)}
              </strong>

              <div
                className={`movement ${
                  isUp
                    ? 'movement-up'
                    : isDown
                      ? 'movement-down'
                      : 'movement-neutral'
                }`}
              >
                {isUp && <ArrowUp size={15} />}
                {isDown && <ArrowDown size={15} />}
                {!isUp && !isDown && <Minus size={15} />}

                {Math.abs(delegate.movement).toFixed(1)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Ranking