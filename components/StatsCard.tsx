interface StatsCardProps {
  title: string
  value: string | number
  icon: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  trend?: {
    value: number
    isPositive: boolean
  }
}

export default function StatsCard({ title, value, icon, color = 'blue', trend }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`${colorClasses[color]} rounded-full p-4`}>
          <span className="text-3xl text-white">{icon}</span>
        </div>
      </div>
    </div>
  )
}
