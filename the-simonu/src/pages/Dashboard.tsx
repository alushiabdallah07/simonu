import {
  Activity,
  Clock3,
  Users,
} from 'lucide-react'

import StatCard from '../components/StatCard'
import Ranking from '../components/Ranking'
import HighlightCard from '../components/HighlightCard'

function Dashboard() {
  return (
    <main className="dashboard">

      {/* CABEÇALHO */}

      <header className="dashboard-header">
        <div>
          <div className="live-status">
            <span className="live-dot" />
            AO VIVO
          </div>

          <h1>THE SIMONU</h1>

          <p>
            Teatro de Operações - Invasão Americana no Irã · 2027
          </p>
        </div>

        <div className="session-indicator">
          <span>SESSÃO</span>
          <strong>01 / 05</strong>
        </div>
      </header>


      {/* ESTATÍSTICAS */}

      <section className="stats-grid">

        <StatCard
          title="SESSÃO"
          value="01 / 05"
          description="Em andamento"
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
          value="24"
          description="Participando agora"
          icon={Users}
        />

      </section>


      {/* CONTEÚDO PRINCIPAL */}

      <section className="main-grid">

        <Ranking />

        <HighlightCard />

      </section>


      {/* EVENTOS */}

      <section className="events-card">

        <div className="section-header">
          <div>
            <span className="section-label">
              ATIVIDADE
            </span>

            <h2>Eventos recentes</h2>
          </div>
        </div>

        <div className="event-list">

          <div className="event">
            <span>17:42</span>
            <p>
              Delegado A respondeu à crise.
            </p>
          </div>

          <div className="event">
            <span>17:40</span>
            <p>
              Delegado C enviou uma nova ordem.
            </p>
          </div>

          <div className="event">
            <span>17:38</span>
            <p>
              Delegado B iniciou uma negociação.
            </p>
          </div>

        </div>

      </section>

    </main>
  )
}

export default Dashboard