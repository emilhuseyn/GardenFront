'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DonutData {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutData[];
  colors?: string[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
}

const DEFAULT_COLORS = ['#34C47E','#4A90D9','#F5A623','#A855F7','#E05252','#14B8A6'];

export function DonutChart({
  data, colors, height = 220, innerRadius = 55, outerRadius = 85,
  showLegend = true, centerLabel, centerValue
}: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? (colors?.[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length])} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E4EDE8',
            borderRadius: '10px',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          formatter={(value: any, name: any) => [value, name]}
        />
        {showLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, marginTop: 4 }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
