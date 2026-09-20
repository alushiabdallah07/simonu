import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import { supabase } from '../lib/supabase'

interface Delegate {
  participationId: string
  name: string
  representation: string
}

interface EvaluationCategory {
  id: string
  name: string
  description: string | null
  weight: number
  max_score: number
  display_order: number
}

interface ExistingEvaluation {
  id: string
  participation_id: string
  evaluation_category_id: string
  session_id: string
  score: number
  feedback: string | null
}

function BoardEvaluation() {
  const [delegates, setDelegates] =
    useState<Delegate[]>([])

  const [categories, setCategories] =
    useState<EvaluationCategory[]>([])

  const [selectedDelegate, setSelectedDelegate] =
    useState('')

  const [scores, setScores] =
    useState<Record<string, string>>({})

  const [loading, setLoading] =
    useState(true)

  const [loadingScores, setLoadingScores] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  /*
   * Carrega os delegados e as categorias
   */
  useEffect(() => {
    async function loadData() {
      setLoading(true)

      /*
       * 1. Buscar o comitê
       */

      const {
        data: committeeData,
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
          'Erro ao carregar comitê:',
          committeeError
        )

        setLoading(false)
        return
      }

      /*
       * 2. Buscar delegados
       */

      const {
        data: participationData,
        error: participationError,
      } = await supabase
        .from('participations')
        .select(`
          id,
          representation,
          delegate:delegate_id (
            name
          )
        `)
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
          'Erro ao carregar delegados:',
          participationError
        )
      }

      if (participationData) {
        const formattedDelegates =
          participationData.map(
            (participation: any) => ({
              participationId:
                participation.id,

              name:
                participation.delegate?.name ??
                'Delegado',

              representation:
                participation.representation,
            })
          )

        setDelegates(
          formattedDelegates
        )
      }

      /*
       * 3. Buscar categorias
       */

      const {
        data: categoryData,
        error: categoryError,
      } = await supabase
        .from('evaluation_categories')
        .select(`
          id,
          name,
          description,
          weight,
          max_score,
          display_order
        `)
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
      }

      if (categoryData) {
        setCategories(
          categoryData
        )
      }

      setLoading(false)
    }

    loadData()
  }, [])

  /*
   * Busca a sessão atualmente ao vivo.
   */
  async function getCurrentSession() {
    const {
      data,
      error,
    } = await supabase
      .from('sessions')
      .select('id')
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

    if (error) {
      console.error(
        'Erro ao buscar sessão:',
        error
      )

      return null
    }

    return data
  }

  /*
   * Quando a Mesa seleciona um delegado,
   * busca as avaliações que já existem
   * para ele na sessão atual.
   */
  async function loadExistingScores(
    participationId: string
  ) {
    setLoadingScores(true)
    setMessage('')

    /*
     * Primeiro encontramos a sessão atual.
     */

    const session =
      await getCurrentSession()

    if (!session) {
      setScores({})
      setMessage(
        'Nenhuma sessão ao vivo encontrada.'
      )

      setLoadingScores(false)
      return
    }

    /*
     * Busca avaliações existentes
     * desse delegado nessa sessão.
     */

    const {
      data: evaluationData,
      error: evaluationError,
    } = await supabase
      .from('evaluations')
      .select(`
        id,
        participation_id,
        evaluation_category_id,
        session_id,
        score,
        feedback
      `)
      .eq(
        'participation_id',
        participationId
      )
      .eq(
        'session_id',
        session.id
      )

    if (evaluationError) {
      console.error(
        'Erro ao carregar avaliações existentes:',
        evaluationError
      )

      setScores({})
      setMessage(
        'Não foi possível carregar as notas existentes.'
      )

      setLoadingScores(false)
      return
    }

    /*
     * Transforma as avaliações em:
     *
     * {
     *   categoriaId: "nota"
     * }
     */

    const loadedScores:
      Record<string, string> = {}

    evaluationData?.forEach(
      (
        evaluation: ExistingEvaluation
      ) => {
        loadedScores[
          evaluation.evaluation_category_id
        ] =
          String(
            evaluation.score
          )
      }
    )

    setScores(
      loadedScores
    )

    setLoadingScores(false)
  }

  /*
   * Seleciona um delegado e carrega
   * automaticamente suas notas.
   */
  async function handleSelectDelegate(
    participationId: string
  ) {
    setSelectedDelegate(
      participationId
    )

    await loadExistingScores(
      participationId
    )
  }

  /*
   * Altera uma nota.
   */
  function handleScoreChange(
    categoryId: string,
    value: string
  ) {
    setScores(
      (current) => ({
        ...current,
        [categoryId]:
          value,
      })
    )

    setMessage('')
  }

  /*
   * Salva as avaliações.
   *
   * Se a avaliação já existir:
   * UPDATE
   *
   * Se ainda não existir:
   * INSERT
   */
  async function handleSave() {
    setMessage('')

    if (!selectedDelegate) {
      setMessage(
        'Selecione um delegado antes de salvar.'
      )

      return
    }

    /*
     * Verifica se todas as categorias
     * possuem uma nota.
     */

    const missingCategory =
      categories.some(
        (category) =>
          scores[
            category.id
          ] === undefined ||
          scores[
            category.id
          ] === ''
      )

    if (missingCategory) {
      setMessage(
        'Preencha todas as notas antes de salvar.'
      )

      return
    }

    /*
     * Valida os limites das notas.
     */

    const invalidScore =
      categories.some(
        (category) => {
          const score =
            Number(
              scores[
                category.id
              ]
            )

          return (
            Number.isNaN(
              score
            ) ||
            score < 0 ||
            score >
              Number(
                category.max_score
              )
          )
        }
      )

    if (invalidScore) {
      setMessage(
        'Existe uma nota fora do limite permitido.'
      )

      return
    }

    setSaving(true)

    /*
     * Busca a sessão atual.
     */

    const session =
      await getCurrentSession()

    if (!session) {
      setMessage(
        'Nenhuma sessão ao vivo encontrada.'
      )

      setSaving(false)
      return
    }

    /*
     * Busca avaliações que já existem
     * para esse delegado nessa sessão.
     */

    const {
      data: existingEvaluations,
      error: existingError,
    } = await supabase
      .from('evaluations')
      .select(`
        id,
        evaluation_category_id
      `)
      .eq(
        'participation_id',
        selectedDelegate
      )
      .eq(
        'session_id',
        session.id
      )

    if (existingError) {
      console.error(
        'Erro ao buscar avaliações existentes:',
        existingError
      )

      setMessage(
        'Não foi possível verificar as avaliações existentes.'
      )

      setSaving(false)
      return
    }

    /*
     * Salva cada categoria individualmente.
     */

    for (
      const category
      of categories
    ) {
      const score =
        Number(
          scores[
            category.id
          ]
        )

      const existingEvaluation =
        existingEvaluations?.find(
          (evaluation) =>
            evaluation.evaluation_category_id ===
            category.id
        )

      /*
       * Se já existe:
       * atualiza.
       */

      if (
        existingEvaluation
      ) {
        const {
          error: updateError,
        } = await supabase
          .from('evaluations')
          .update({
            score,
          })
          .eq(
            'id',
            existingEvaluation.id
          )

        if (updateError) {
          console.error(
            'Erro ao atualizar avaliação:',
            updateError
          )

          setMessage(
            `Erro ao atualizar a nota de ${category.name}.`
          )

          setSaving(false)
          return
        }
      }

      /*
       * Se não existe:
       * cria.
       */

      else {
        const {
          error: insertError,
        } = await supabase
          .from('evaluations')
          .insert({
            participation_id:
              selectedDelegate,

            evaluation_category_id:
              category.id,

            session_id:
              session.id,

            score,

            feedback:
              null,
          })

        if (insertError) {
          console.error(
            'Erro ao inserir avaliação:',
            insertError
          )

          setMessage(
            `Erro ao salvar a nota de ${category.name}.`
          )

          setSaving(false)
          return
        }
      }
    }

    /*
     * Recarrega as notas do banco
     * depois de salvar.
     */

    await loadExistingScores(
      selectedDelegate
    )

    setMessage(
      'Avaliação salva com sucesso.'
    )

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="dashboard">

        <div className="section-header">

          <div>

            <span className="section-label">
              MESA DIRETORA
            </span>

            <h1>
              Avaliação
            </h1>

          </div>

        </div>

        <p>
          Carregando dados...
        </p>

      </main>
    )
  }

  const selectedDelegateData =
    delegates.find(
      (delegate) =>
        delegate.participationId ===
        selectedDelegate
    )

  return (
    <main className="dashboard">

      <header className="dashboard-header">

        <div>

          <div className="live-status">

            <span className="live-dot" />

            MESA DIRETORA

          </div>

          <h1>
            Avaliação dos delegados
          </h1>

          <p>
            Invasão Americana no Irã
          </p>

        </div>

      </header>

      <section className="main-grid">

        <section className="ranking-card">

          <div className="section-header">

            <div>

              <span className="section-label">
                DELEGADO
              </span>

              <h2>
                Selecionar participante
              </h2>

            </div>

          </div>

          <div className="ranking-list">

            {delegates.map(
              (delegate) => {

                const selected =
                  selectedDelegate ===
                  delegate.participationId

                return (
                  <button
                    key={
                      delegate.participationId
                    }
                    type="button"
                    className="ranking-row"
                    onClick={() =>
                      handleSelectDelegate(
                        delegate.participationId
                      )
                    }
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >

                    <span className="ranking-position">
                      {selected
                        ? '✓'
                        : ''}
                    </span>

                    <div className="delegate-info">

                      <strong>
                        {delegate.name}
                      </strong>

                      <span>
                        {delegate.representation}
                      </span>

                    </div>

                  </button>
                )
              }
            )}

          </div>

        </section>

        <section className="highlight-card">

          <div className="highlight-header">

            <span>
              AVALIAÇÃO
            </span>

            {selectedDelegate && (
              <span className="live-badge">
                SELECIONADO
              </span>
            )}

          </div>

          <div className="highlight-content">

            {!selectedDelegate && (
              <>
                <span className="highlight-label">
                  AGUARDANDO
                </span>

                <h2>
                  Selecione um delegado
                </h2>

                <p>
                  Escolha um participante para
                  registrar ou editar sua avaliação.
                </p>
              </>
            )}

            {selectedDelegate && (
              <>
                <span className="highlight-label">
                  NOTAS DA MESA
                </span>

                <h2>
                  {selectedDelegateData?.name}
                </h2>

                <p>
                  {selectedDelegateData?.representation}
                </p>

                {loadingScores ? (
                  <p>
                    Carregando notas...
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                      marginTop: '24px',
                    }}
                  >

                    {categories.map(
                      (category) => (
                        <div
                          key={
                            category.id
                          }
                        >

                          <div
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              marginBottom:
                                '8px',
                            }}
                          >

                            <strong>
                              {category.name}
                            </strong>

                            <span>
                              Peso: {category.weight}%
                            </span>

                          </div>

                          <input
                            type="number"
                            min="0"
                            max={
                              category.max_score
                            }
                            step="0.1"
                            value={
                              scores[
                                category.id
                              ] ?? ''
                            }
                            onChange={(
                              event
                            ) =>
                              handleScoreChange(
                                category.id,
                                event.target.value
                              )
                            }
                            placeholder={`0 - ${category.max_score}`}
                            style={{
                              width: '100%',
                              padding:
                                '12px',
                              borderRadius:
                                '8px',
                              border:
                                '1px solid currentColor',
                              background:
                                'transparent',
                              color:
                                'inherit',
                              fontSize:
                                '16px',
                            }}
                          />

                          {category.description && (
                            <small>
                              {
                                category.description
                              }
                            </small>
                          )}

                        </div>
                      )
                    )}

                    <button
                      type="button"
                      onClick={
                        handleSave
                      }
                      disabled={
                        saving ||
                        loadingScores
                      }
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        gap: '8px',
                        padding:
                          '14px',
                        border:
                          'none',
                        borderRadius:
                          '8px',
                        cursor:
                          saving
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                    >

                      {saving ? (
                        'Salvando...'
                      ) : (
                        <>
                          <Save
                            size={18}
                          />

                          Salvar avaliação
                        </>
                      )}

                    </button>

                    {message && (
                      <p>
                        {message}
                      </p>
                    )}

                  </div>
                )}

              </>
            )}

          </div>

        </section>

      </section>

    </main>
  )
}

export default BoardEvaluation