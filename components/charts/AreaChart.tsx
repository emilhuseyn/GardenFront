'use client';
import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface AreaChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  gradient?: boolean;
  formatY?: (v: number) => string;
  formatTooltip?: (v: number) => string;
  label?: string;
}

export function AreaChart({
  data, dataKey, xKey = 'name', color = '#34C47E',
  height = 240, gradient = true, formatY, formatTooltip, label
}: AreaChartProps) {
  const gradientId = `gradient-${dataKey}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReAreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          {gradient && (
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4EDE8" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatY}
          dx={-4}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E4EDE8',
            borderRadius: '10px',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          formatter={(value: any) => [
            formatTooltip ? formatTooltip(value) : value,
            label || dataKey
          ]}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={gradient ? `url(#${gradientId})` : 'none'}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </ReAreaChart>
    </ResponsiveContainer>
  );
}
