import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { TrendPoint } from '../types'

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="trend">
      <div className="trend__legend">
        <span className="trend__key trend__key--hub">This hub</span>
        <span className="trend__key trend__key--nat">National</span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#eceae2" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#7a847d' }}
            tickLine={false}
            axisLine={{ stroke: '#e4e0d6' }}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#7a847d' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e4e0d6',
              boxShadow: '0 2px 8px rgba(28,43,42,.08)',
            }}
          />
          <Line
            type="monotone"
            dataKey="national"
            name="National"
            stroke="#b9c2bc"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="hub"
            name="This hub"
            stroke="#1a6f69"
            strokeWidth={2.25}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
