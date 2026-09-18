import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: LucideIcon
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon">
        <Icon size={20} />
      </div>

      <div className="stat-card-content">
        <span className="stat-card-title">{title}</span>

        <strong className="stat-card-value">
          {value}
        </strong>

        <span className="stat-card-description">
          {description}
        </span>
      </div>
    </div>
  )
}

export default StatCard