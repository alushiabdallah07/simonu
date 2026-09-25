import { useEffect, useState } from 'react'
import { Check, ChevronDown, Save } from 'lucide-react'

import { supabase } from '../lib/supabase'

interface Committee {
  id: string
  name: string
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

interface EvaluationCategory {
  id: string
  name: string
  description: string | null
  weight: number
  max_score: number
  display_order: number
}

interface EvaluationRound {
  id: string
  session_id: string
  name: string
}

interface ScoreState {
  [categoryId: string]: string
}

function BoardEvaluation() {
  const [committee, setCommittee] =
    useState<Committee | null>(null)

  const [participations, setParticipations] =
    useState<Participation[]>([])

  const [delegates, setDelegates] =
    useState<Delegate[]>([])

  const [categories, setCategories] =
    useState<EvaluationCategory[]>([])

  const [currentRound, setCurrentRound] =
    useState<EvaluationRound | null>(null)

  const [selectedParticipationId, setSelectedParticipationId] =
    useState('')

  const [scores, setScores] =
    useState<ScoreState>({})

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        /*
         * 1. Buscar o comitê
         */

        const {
          data: committeeData,
          error: committeeError,
        } = await supabase
          .from('committees')
          .select('id, name')
          .eq(
            'name',
            'Invasão Americana no Irã'
          )
          .single()

        if (committeeError) {
          console.error(
            'Erro ao carregar comitê:',
            committeeError
          )

          return
        }

        setCommittee(committeeData)

        /*
         * 2. Buscar participantes
         */

        const {
          data: participationData,
          error: participationError,
        } = await supabase
          .from('participations')
          .select(
            'id, representation, delegate_id'
          )
          .eq(
            'committee_id',
            committeeData.id
          )
          .eq(
            'status',
            'ACTIVE'
          )

        if (participationError) {
          console.error(
            'Erro ao carregar participantes:',
            participationError
          )

          return
        }

        setParticipations(
          participationData ?? []
        )

        /*
         * 3. Buscar delegados
         */

        const delegateIds =
          (participationData ?? []).map(
            (participation) =>
              participation.delegate_id
          )

        if (delegateIds.length > 0) {
          const {
            data: delegateData,
            error: delegateError,
          } = await supabase
            .from('delegates')
            .select('id, name')
            .in(
              'id',
              delegateIds
            )

          if (delegateError) {
            console.error(
              'Erro ao carregar delegados:',
              delegateError
            )

            return
          }

          setDelegates(
            delegateData ?? []
          )
        }

        /*
         * 4. Buscar categorias do comitê
         *
         * As categorias continuam dinâmicas.
         */

        const {
          data: categoryData,
          error: categoryError,
        } = await supabase
          .from('evaluation_categories')
          .select(
            `
              id,
              name,
              description,
              weight,
              max_score,
              display_order
            `
          )
          .eq(
            'committee_id',
            committeeData.id
          )
          .order(
            'display_order',
            {
              ascending: true,
            }
          )

        if (categoryError) {
          console.error(
            'Erro ao carregar categorias:',
            categoryError
          )

          return
        }

        setCategories(
          categoryData ?? []
        )

        /*
         * 5. Buscar a sessão atual
         */

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase
          .from('sessions')
          .select('id, number')
          .eq(
            'committee_id',
            committeeData.id
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
            'Erro ao carregar sessão:',
            sessionError
          )

          return
        }

        if (!sessionData) {
          setMessage(
            'Nenhuma sessão ao vivo encontrada.'
          )

          return
        }

        /*
         * 6. Buscar a rodada atual
         */

        const {
          data: roundData,
          error: roundError,
        } = await supabase
          .from('evaluation_rounds')
          .select(
            'id, session_id, name'
          )
          .eq(
            'session_id',
            sessionData.id
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle()

        if (roundError) {
          console.error(
            'Erro ao carregar rodada:',
            roundError
          )

          return
        }

        if (!roundData) {
          setMessage(
            'Nenhuma rodada de avaliação encontrada.'
          )

          return
        }

        setCurrentRound(
          roundData
        )

      } catch (error) {
        console.error(
          'Erro inesperado ao carregar avaliação:',
          error
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  /*
   * Quando a Mesa seleciona um delegado,
   * começamos uma avaliação nova.
   *
   * Não carregamos notas antigas para
   * dentro da nova avaliação.
   */

  function handleParticipationChange(
    participationId: string
  ) {
    setSelectedParticipationId(
      participationId
    )

    setScores({})

    setMessage('')
  }

  /*
   * Atualiza a nota de uma categoria.
   */

  function handleScoreChange(
    categoryId: string,
    value: string
  ) {
    setScores(
      (current) => ({
        ...current,
        [categoryId]: value,
      })
    )

    setMessage('')
  }

  /*
   * Salvar avaliação
   */

  async function handleSave() {
    setMessage('')

    if (!selectedParticipationId) {
      setMessage(
        'Selecione um delegado.'
      )

      return
    }

    if (!currentRound) {
      setMessage(
        'Nenhuma rodada de avaliação está disponível.'
      )

      return
    }

    /*
     * Verificar se todas as categorias
     * receberam uma nota.
     */

    for (const category of categories) {
      const value =
        scores[category.id]

      if (
        value === undefined ||
        value === ''
      ) {
        setMessage(
          `Informe uma nota para "${category.name}".`
        )

        return
      }

      const numericValue =
        Number(value)

      if (
        Number.isNaN(numericValue)
      ) {
        setMessage(
          `A nota de "${category.name}" é inválida.`
        )

        return
      }

      if (
        numericValue < 0 ||
        numericValue > category.max_score
      ) {
        setMessage(
          `A nota de "${category.name}" deve estar entre 0 e ${category.max_score}.`
        )

        return
      }
    }

    try {
      setSaving(true)

      /*
       * Criamos NOVAS avaliações.
       *
       * Não fazemos UPDATE.
       *
       * Isso preserva o histórico.
       */

      const evaluationRows =
        categories.map(
          (category) => ({
            participation_id:
              selectedParticipationId,

            evaluation_category_id:
              category.id,

            session_id:
              currentRound.session_id,

            evaluation_round_id:
              currentRound.id,

            score:
              Number(
                scores[category.id]
              ),

            feedback:
              null,
          })
        )

      const {
        error,
      } = await supabase
        .from('evaluations')
        .insert(
          evaluationRows
        )

      if (error) {
        console.error(
          'Erro ao salvar avaliação:',
          error
        )

        setMessage(
          `Erro ao salvar avaliação: ${error.message}`
        )

        return
      }

      /*
       * Limpa o formulário para que
       * a Mesa possa avaliar outro delegado.
       */

      setScores({})

      setMessage(
        'Avaliação registrada com sucesso.'
      )

    } catch (error) {
      console.error(
        'Erro inesperado ao salvar avaliação:',
        error
      )

      setMessage(
        'Ocorreu um erro ao salvar a avaliação.'
      )
    } finally {
      setSaving(false)
    }
  }

  const selectedParticipation =
    participations.find(
      (participation) =>
        participation.id ===
        selectedParticipationId
    )

  const selectedDelegate =
    delegates.find(
      (delegate) =>
        delegate.id ===
        selectedParticipation?.delegate_id
    )

  if (loading) {
    return (
      <main className="board-evaluation">
        <p>
          Carregando avaliação...
        </p>
      </main>
    )
  }

  return (
    <main className="board-evaluation">

      <header className="board-evaluation-header">

        <div>

          <span className="section-label">
            MESA DIRETORA
          </span>

          <h1>
            Avaliação dos delegados
          </h1>

          <p>
            {committee?.name}
          </p>

        </div>

        <div className="evaluation-round">

          <span>
            RODADA
          </span>

          <strong>
            {currentRound?.name ?? '—'}
          </strong>

        </div>

      </header>

      <section className="evaluation-panel">

        <div className="evaluation-select">

          <label>
            Delegado
          </label>

          <div className="select-wrapper">

            <select
              value={
                selectedParticipationId
              }
              onChange={(event) =>
                handleParticipationChange(
                  event.target.value
                )
              }
            >

              <option value="">
                Selecione um delegado
              </option>

              {participations.map(
                (participation) => {

                  const delegate =
                    delegates.find(
                      (item) =>
                        item.id ===
                        participation.delegate_id
                    )

                  return (
                    <option
                      key={
                        participation.id
                      }
                      value={
                        participation.id
                      }
                    >
                      {delegate?.name ??
                        'Delegado'}
                      {' — '}
                      {participation.representation}
                    </option>
                  )
                }
              )}

            </select>

            <ChevronDown
              size={18}
            />

          </div>

        </div>

        {selectedParticipationId && (
          <div className="selected-delegate">

            <strong>
              {selectedDelegate?.name}
            </strong>

            <span>
              {selectedParticipation?.representation}
            </span>

          </div>
        )}

        <div className="evaluation-categories">

          {categories.map(
            (category) => (

              <div
                className="evaluation-category"
                key={category.id}
              >

                <div className="evaluation-category-info">

                  <div>

                    <strong>
                      {category.name}
                    </strong>

                    {category.description && (
                      <p>
                        {category.description}
                      </p>
                    )}

                  </div>

                  <span>
                    Peso: {category.weight}%
                  </span>

                </div>

                <div className="score-input">

                  <input
                    type="number"
                    min="0"
                    max={
                      category.max_score
                    }
                    step="0.1"
                    placeholder="0"
                    value={
                      scores[
                        category.id
                      ] ?? ''
                    }
                    onChange={(event) =>
                      handleScoreChange(
                        category.id,
                        event.target.value
                      )
                    }
                  />

                  <span>
                    / {category.max_score}
                  </span>

                </div>

              </div>

            )
          )}

        </div>

        {message && (
          <div className="evaluation-message">
            {message}
          </div>
        )}

        <button
          type="button"
          className="save-evaluation"
          onClick={handleSave}
          disabled={
            saving ||
            !selectedParticipationId ||
            !currentRound
          }
        >

          {saving ? (
            <>
              Salvando...
            </>
          ) : (
            <>
              <Save size={18} />
              Registrar avaliação
            </>
          )}

        </button>

      </section>

    </main>
  )
}

export default BoardEvaluation