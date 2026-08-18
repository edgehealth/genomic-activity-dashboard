import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Label,
} from 'recharts'
import type { MetricKey, TrendPoint } from '../types'
import { METRICS } from '../data/metrics'

interface Props {
  data: TrendPoint[]
  metric: MetricKey
}

export default function TrendChart({ data, metric }: Props) {
  const def = METRICS[metric]
  const { axisLabel, unit } = def.trend
  const hubHasData = data.some((p) => p.hub != null)

  return (
    <div className="trend">
      <div className="trend__legend">
        <span className="trend__key trend__key--hub">This hub</span>
        <span className="trend__key trend__key--nat">National</span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -8 }}>
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
            width={52}
            tickFormatter={(v: number) => def.format(v)}
          >
            <Label
              value={axisLabel}
              angle={-90}
              position="insideLeft"
              style={{ fontSize: 9.5, fill: '#7a847d', textAnchor: 'middle' }}
            />
          </YAxis>
          <Tooltip
            formatter={(value) =>
              typeof value === 'number' ? `${def.format(value)} ${unit}` : 'No data'
            }
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
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="hub"
            name="This hub"
            stroke="#1a6f69"
            strokeWidth={2.25}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {!hubHasData && (
        <p className="trend__note" role="note">
          No {def.label.toLowerCase()} series for this hub in the source feed.
        </p>
      )}
    </div>
  )
}
