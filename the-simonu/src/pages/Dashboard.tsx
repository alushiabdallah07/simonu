import { useEffect, useState } from 'react'
import {
  Activity,
  Clock3,
  Users,
} from 'lucide-react'

import { supabase } from '../lib/supabase'

import StatCard from '../components/StatCard'
import Ranking from '../components/Ranking'
import HighlightCard from '../components/HighlightCard'

interface Simulation {
  id: string
  name: string
  year: number
  description: string | null
  status: string
}

interface Committee {
  id: string
  name: string
  type: string
  description: string | null
  status: string
}

interface Session {
  id: string
  committee_id: string
  number: number
  status: string
  started_at: string | null
  ended_at: string | null
}

interface Event {
  id: string
  type: string
  title: string
  description: string | null
  created_at: string
  participation: {
    representation: string
    delegate: {
      name: string
    }
  } | null
}

function Dashboard() {
  const [simulation, setSimulation] =
    useState<Simulation | null>(null)

  const [committee, setCommittee] =
    useState<Committee | null>(null)

  const [session, setSession] =
    useState<Session | null>(null)

  const [totalSessions, setTotalSessions] =
    useState<number>(0)

  const [totalDelegates, setTotalDelegates] =
    useState<number>(0)

  const [events, setEvents] =
    useState<Event[]>([])

  useEffect(() => {
    async function loadData() {

      // =====================================================
      // BUSCAR SIMULAÇÃO
      // =====================================================

      const {
        data: simulationData,
        error: simulationError,
      } = await supabase
        .from('simulations')
        .select('*')
        .eq('name', 'THE SIMONU 2027')
        .single()

      if (simulationError) {
        console.error(
          'Erro ao carregar simulação:',
          simulationError
        )
      }

      if (simulationData) {
        setSimulation(simulationData)
      }

      // =====================================================
      // BUSCAR COMITÊ
      // =====================================================

      const {
        data: committeeData,
        error: committeeError,
      } = await supabase
        .from('committees')
        .select('*')
        .eq('name', 'Invasão Americana no Irã')
        .single()

      if (committeeError) {
        console.error(
          'Erro ao carregar comitê:',
          committeeError
        )
      }

      if (!committeeData) {
        return
      }

      setCommittee(committeeData)

      // =====================================================
      // BUSCAR SESSÕES
      // =====================================================

      const {
        data: sessionsData,
        error: sessionsError,
      } = await supabase
        .from('sessions')
        .select('*')
        .eq('committee_id', committeeData.id)
        .order('number', {
          ascending: true,
        })

      if (sessionsError) {
        console.error(
          'Erro ao carregar sessões:',
          sessionsError
        )
      }

      if (sessionsData) {
        setTotalSessions(
          sessionsData.length
        )

        const currentSession =
          sessionsData.find(
            (item) =>
              item.status === 'LIVE'
          )

        if (currentSession) {
          setSession(currentSession)
        }
      }

      // =====================================================
      // BUSCAR PARTICIPANTES
      // =====================================================

      const {
        data: participationsData,
        error: participationsError,
      } = await supabase
        .from('participations')
        .select('id')
        .eq(
          'committee_id',
          committeeData.id
        )

      if (participationsError) {
        console.error(
          'Erro ao carregar participantes:',
          participationsError
        )
      }

      if (participationsData) {
        setTotalDelegates(
          participationsData.length
        )
      }

      // =====================================================
      // BUSCAR EVENTOS
      // =====================================================

      const {
        data: eventsData,
        error: eventsError,
      } = await supabase
        .from('events')
        .select(`
          id,
          type,
          title,
          description,
          created_at,
          participation:participation_id (
            representation,
            delegate:delegate_id (
              name
            )
          )
        `)
        .eq(
          'committee_id',
          committeeData.id
        )
        .eq(
          'is_public',
          true
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(10)

      if (eventsError) {
        console.error(
          'Erro ao carregar eventos:',
          eventsError
        )
      }

      if (eventsData) {
        setEvents(
          eventsData as unknown as Event[]
        )
      }
    }

    loadData()
  }, [])

  const sessionDisplay = session
    ? `${String(session.number).padStart(2, '0')} / ${String(
        totalSessions
      ).padStart(2, '0')}`
    : '...'

  return (
    <main className="dashboard">

      {/* =====================================================
          CABEÇALHO
          ===================================================== */}

      <header className="dashboard-header">

        <div>

          <div className="live-status">
            <span className="live-dot" />
            AO VIVO
          </div>

          <h1>
            {simulation?.name ?? 'Carregando...'}
          </h1>

          <p>
            {committee
              ? `${committee.type === 'TO'
                  ? 'Teatro de Operações'
                  : 'Debate'} - ${committee.name} · ${simulation?.year ?? '...'}`
              : 'Carregando comitê...'}
          </p>

        </div>

        <div className="session-indicator">

          <span>
            SESSÃO
          </span>

          <strong>
            {sessionDisplay}
          </strong>

        </div>

      </header>


      {/* =====================================================
          ESTATÍSTICAS
          ===================================================== */}

      <section className="stats-grid">

        <StatCard
          title="SESSÃO"
          value={sessionDisplay}
          description={
            session?.status === 'LIVE'
              ? 'Em andamento'
              : 'Aguardando'
          }
          icon={Activity}
        />

        <StatCard
          title="TEMPO"
          value="01:24:32"
          description="Sessão atual"
          icon={Clock3}
        />

        <StatCard
          title="DELEGADOS"
          value={String(totalDelegates)}
          description="Participando agora"
          icon={Users}
        />

      </section>


      {/* =====================================================
          CONTEÚDO PRINCIPAL
          ===================================================== */}

      <section className="main-grid">

        <Ranking />

        <HighlightCard />

      </section>


      {/* =====================================================
          EVENTOS
          ===================================================== */}

      <section className="events-card">

        <div className="section-header">

          <div>

            <span className="section-label">
              ATIVIDADE
            </span>

            <h2>
              Eventos recentes
            </h2>

          </div>

        </div>

        <div className="event-list">

          {events.length === 0 && (
            <div className="event">

              <p>
                Nenhum evento público registrado ainda.
              </p>

            </div>
          )}

          {events.map((event) => {

            const eventTime =
              new Date(
                event.created_at
              ).toLocaleTimeString(
                'pt-BR',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )

            return (
              <div
                className="event"
                key={event.id}
              >

                <span>
                  {eventTime}
                </span>

                <p>

                  {event.participation?.delegate && (
                    <strong>
                      {event.participation.delegate.name}
                      {' — '}
                    </strong>
                  )}

                  {event.title}

                </p>

              </div>
            )
          })}

        </div>

      </section>

    </main>
  )
}

export default Dashboard