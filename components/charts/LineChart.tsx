'use client';
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface LineChartProps {
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  color?: string;
  secondKey?: string;
  secondColor?: string;
  height?: number;
  unit?: string;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-white-border shadow-lg rounded-xl px-3 py-2 text-xs">
        <p className="font-semibold text-gray-600 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-mono-nums">
            {p.name}: {p.value}{unit ?? ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function LineChart({
  data, dataKey, xKey, color = '#34C47E',
  secondKey, secondColor = '#4A90D9',
  height = 250, unit,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'DM Sans' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'DM Sans' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} />
        {secondKey && <Legend wrapperStyle={{ fontSize: '11px' }} />}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        {secondKey && (
          <Line
            type="monotone"
            dataKey={secondKey}
            stroke={secondColor}
            strokeWidth={2.5}
            dot={{ fill: secondColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            strokeDasharray="5 5"
          />
        )}
      </ReLineChart>
    </ResponsiveContainer>
  );
}
