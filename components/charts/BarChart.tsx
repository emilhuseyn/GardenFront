'use client';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';

interface BarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  formatY?: (v: number) => string;
  formatTooltip?: (v: number) => string;
  label?: string;
  secondDataKey?: string;
  secondColor?: string;
  secondLabel?: string;
}

export function BarChart({
  data, dataKey, xKey = 'name', color = '#34C47E',
  height = 240, formatY, formatTooltip, label,
  secondDataKey, secondColor = '#4A90D9', secondLabel
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={14}>
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
          formatter={(value: any, name: any) => [
            formatTooltip ? formatTooltip(value) : value,
            name === dataKey ? (label || dataKey) : (secondLabel || name)
          ]}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        {secondDataKey && (
          <Legend
            wrapperStyle={{ fontSize: 11, marginTop: 8 }}
            formatter={(value) => value === dataKey ? (label || dataKey) : (secondLabel || value)}
          />
        )}
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        {secondDataKey && (
          <Bar dataKey={secondDataKey} fill={secondColor} radius={[4, 4, 0, 0]} />
        )}
      </ReBarChart>
    </ResponsiveContainer>
  );
}
