import { useEffect, useState } from 'react'
import { Minus, Trophy } from 'lucide-react'

import { supabase } from '../lib/supabase'

interface RankingDelegate {
  position: number
  name: string
  representation: string
  score: number
}

interface Participation {
  id: string
  representation: string
  delegate_id: string
}

interface Delegate {
  id: string
  name: string
}

interface Evaluation {
  score: number
  participation_id: string
  evaluation_category_id: string
}

interface EvaluationCategory {
  id: string
  weight: number
  max_score: number
}

function Ranking() {
  const [delegates, setDelegates] =
    useState<RankingDelegate[]>([])

  const [loading, setLoading] =
    useState(true)

  async function loadRanking() {
    try {
      setLoading(true)

      /*
       * 1. Buscar o comitê atual
       */

      const {
        data: committee,
        error: committeeError,
      } = await supabase
        .from('committees')
        .select('id')
        .eq(
          'name',
          'Invasão Americana no Irã'
        )
        .single()

      if (committeeError) {
        console.error(
          'Erro ao buscar comitê:',
          committeeError
        )

        setDelegates([])
        return
      }

      /*
       * 2. Buscar a sessão atual
       */

      const {
        data: session,
        error: sessionError,
      } = await supabase
        .from('sessions')
        .select('id')
        .eq(
          'committee_id',
          committee.id
        )
        .eq(
          'status',
          'LIVE'
        )
        .order(
          'number',
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle()

      if (sessionError) {
        console.error(
          'Erro ao buscar sessão:',
          sessionError
        )

        setDelegates([])
        return
      }

      if (!session) {
        setDelegates([])
        return
      }

      /*
       * 3. Buscar os participantes
       */

      const {
        data: participations,
        error: participationError,
      } = await supabase
        .from('participations')
        .select(
          'id, representation, delegate_id'
        )
        .eq(
          'committee_id',
          committee.id
        )
        .eq(
          'status',
          'ACTIVE'
        )

      if (participationError) {
        console.error(
          'Erro ao buscar participantes:',
          participationError
        )

        setDelegates([])
        return
      }

      if (
        !participations ||
        participations.length === 0
      ) {
        setDelegates([])
        return
      }

      /*
       * 4. Buscar avaliações da sessão atual
       */

      const participationIds =
        participations.map(
          (participation) =>
            participation.id
        )

      const {
        data: evaluations,
        error: evaluationError,
      } = await supabase
        .from('evaluations')
        .select(
          'score, participation_id, evaluation_category_id'
        )
        .in(
          'participation_id',
          participationIds
        )
        .eq(
          'session_id',
          session.id
        )

      if (evaluationError) {
        console.error(
          'Erro ao buscar avaliações:',
          evaluationError
        )

        setDelegates([])
        return
      }

      if (
        !evaluations ||
        evaluations.length === 0
      ) {
        setDelegates([])
        return
      }

      /*
       * 5. Buscar categorias
       */

      const categoryIds = [
        ...new Set(
          evaluations.map(
            (evaluation) =>
              evaluation.evaluation_category_id
          )
        ),
      ]

      const {
        data: categories,
        error: categoryError,
      } = await supabase
        .from('evaluation_categories')
        .select(
          'id, weight, max_score'
        )
        .in(
          'id',
          categoryIds
        )

      if (categoryError) {
        console.error(
          'Erro ao buscar categorias:',
          categoryError
        )

        setDelegates([])
        return
      }

      /*
       * 6. Buscar nomes dos delegados
       */

      const delegateIds = [
        ...new Set(
          participations.map(
            (participation) =>
              participation.delegate_id
          )
        ),
      ]

      const {
        data: delegatesData,
        error: delegateError,
      } = await supabase
        .from('delegates')
        .select(
          'id, name'
        )
        .in(
          'id',
          delegateIds
        )

      if (delegateError) {
        console.error(
          'Erro ao buscar delegados:',
          delegateError
        )

        setDelegates([])
        return
      }

      /*
       * 7. Criar mapas
       */

      const participationMap =
        new Map<
          string,
          Participation
        >()

      participations.forEach(
        (participation) => {
          participationMap.set(
            participation.id,
            participation
          )
        }
      )

      const delegateMap =
        new Map<
          string,
          Delegate
        >()

      delegatesData?.forEach(
        (delegate) => {
          delegateMap.set(
            delegate.id,
            delegate
          )
        }
      )

      const categoryMap =
        new Map<
          string,
          EvaluationCategory
        >()

      categories?.forEach(
        (category) => {
          categoryMap.set(
            category.id,
            category
          )
        }
      )

      /*
       * 8. Calcular a pontuação
       */

      const scoreMap =
        new Map<
          string,
          RankingDelegate
        >()

      evaluations.forEach(
        (evaluation) => {

          const participation =
            participationMap.get(
              evaluation.participation_id
            )

          if (!participation) {
            return
          }

          const delegate =
            delegateMap.get(
              participation.delegate_id
            )

          if (!delegate) {
            return
          }

          const category =
            categoryMap.get(
              evaluation.evaluation_category_id
            )

          if (!category) {
            return
          }

          const score =
            Number(
              evaluation.score
            )

          const maxScore =
            Number(
              category.max_score
            )

          const weight =
            Number(
              category.weight
            )

          if (
            maxScore <= 0
          ) {
            return
          }

          /*
           * Nota normalizada:
           *
           * 9 / 10 × 100 = 90
           */

          const normalizedScore =
            (
              score /
              maxScore
            ) * 100

          /*
           * Nota ponderada:
           *
           * 90 × 40% = 36
           */

          const weightedScore =
            normalizedScore *
            (weight / 100)

          const current =
            scoreMap.get(
              participation.id
            )

          if (current) {
            current.score +=
              weightedScore
          } else {
            scoreMap.set(
              participation.id,
              {
                position: 0,

                name:
                  delegate.name,

                representation:
                  participation.representation,

                score:
                  weightedScore,
              }
            )
          }
        }
      )

      /*
       * 9. Ordenar o ranking
       */

      const ranking =
        Array.from(
          scoreMap.values()
        )
          .sort(
            (a, b) =>
              b.score -
              a.score
          )
          .map(
            (
              delegate,
              index
            ) => ({
              ...delegate,

              position:
                index + 1,
            })
          )

      setDelegates(
        ranking
      )

    } catch (error) {
      console.error(
        'Erro inesperado no ranking:',
        error
      )

      setDelegates([])
    } finally {
      setLoading(false)
    }
  }

  /*
   * Carrega o ranking quando a página abre.
   *
   * Atualiza automaticamente a cada 60 segundos.
   */

  useEffect(() => {
    loadRanking()

    const interval =
      setInterval(
        loadRanking,
        60_000
      )

    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <section className="ranking-card">

      <div className="section-header">

        <div>

          <span className="section-label">
            COMPETIÇÃO
          </span>

          <h2>
            Ranking ao vivo
          </h2>

        </div>

        <Trophy size={24} />

      </div>

      <div className="ranking-list">

        {loading && (
          <div className="ranking-loading">
            Carregando ranking...
          </div>
        )}

        {!loading &&
          delegates.length === 0 && (
            <div className="ranking-loading">
              Nenhuma avaliação registrada ainda.
            </div>
          )}

        {!loading &&
          delegates.map(
            (delegate) => (
              <div
                className="ranking-row"
                key={`${delegate.name}-${delegate.representation}`}
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
            )
          )}

      </div>

    </section>
  )
}

export default Ranking