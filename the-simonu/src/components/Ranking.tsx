import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Trophy,
} from 'lucide-react'

import { supabase } from '../lib/supabase'

interface RankingDelegate {
  position: number
  name: string
  representation: string
  score: number
}

function Ranking() {
  const [delegates, setDelegates] = useState<RankingDelegate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRanking() {
      setLoading(true)

      // =====================================================
      // BUSCAR O COMITÊ
      // =====================================================

      const {
        data: committeeData,
        error: committeeError,
      } = await supabase
        .from('committees')
        .select('id')
        .eq('name', 'Invasão Americana no Irã')
        .single()

      if (committeeError) {
        console.error(
          'Erro ao carregar comitê:',
          committeeError
        )

        setLoading(false)
        return
      }

      // =====================================================
      // BUSCAR AVALIAÇÕES
      // =====================================================

      const {
        data: evaluationsData,
        error: evaluationsError,
      } = await supabase
        .from('evaluations')
        .select(`
          score,
          participation:participation_id (
            id,
            representation,
            delegate:delegate_id (
              name
            )
          ),
          category:evaluation_category_id (
            weight
          )
        `)

      if (evaluationsError) {
        console.error(
          'Erro ao carregar avaliações:',
          evaluationsError
        )

        setLoading(false)
        return
      }

      // =====================================================
      // CALCULAR SCORE PONDERADO
      // =====================================================

      const scores = new Map<
        string,
        {
          name: string
          representation: string
          score: number
        }
      >()

      evaluationsData?.forEach((evaluation: any) => {
        const participation = evaluation.participation
        const delegate = participation?.delegate
        const category = evaluation.category

        if (!participation || !delegate || !category) {
          return
        }

        const current = scores.get(participation.id)

        const weightedScore =
          Number(evaluation.score) *
          (Number(category.weight) / 100)

        if (current) {
          current.score += weightedScore
        } else {
          scores.set(participation.id, {
            name: delegate.name,
            representation: participation.representation,
            score: weightedScore,
          })
        }
      })

      // =====================================================
      // TRANSFORMAR EM RANKING
      // =====================================================

      const ranking = Array.from(scores.values())
        .sort((a, b) => b.score - a.score)
        .map((delegate, index) => ({
          position: index + 1,
          name: delegate.name,
          representation: delegate.representation,
          score: delegate.score * 10,
        }))

      setDelegates(ranking)
      setLoading(false)
    }

    loadRanking()
  }, [])

  return (
    <section className="ranking-card">
      <div className="section-header">
        <div>
          <span className="section-label">
            COMPETIÇÃO
          </span>

          <h2>Ranking ao vivo</h2>
        </div>

        <Trophy size={24} />
      </div>

      <div className="ranking-list">

        {loading && (
          <div className="ranking-loading">
            Carregando ranking...
          </div>
        )}

        {!loading && delegates.length === 0 && (
          <div className="ranking-loading">
            Nenhuma avaliação registrada ainda.
          </div>
        )}

        {!loading &&
          delegates.map((delegate) => (
            <div
              className="ranking-row"
              key={delegate.position}
            >
              <span className="ranking-position">
                {delegate.position}
              </span>

              <div className="delegate-info">
                <strong>
                  {delegate.name}
                </strong>

                <span>
                  {delegate.representation}
                </span>
              </div>

              <strong className="delegate-score">
                {delegate.score.toFixed(1)}
              </strong>

              <div className="movement movement-neutral">
                <Minus size={15} />
                0.0
              </div>
            </div>
          ))}
      </div>
    </section>
  )
}

export default Ranking