import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PlatformStats } from '../types.ts';

interface ChartsSectionProps {
  stats: PlatformStats;
}

const CATEGORY_COLORS = ['#0D9488', '#0284C7', '#D97706', '#475569'];

export function ChartsSection({ stats }: ChartsSectionProps) {
  const categoryData = stats.categoryBreakdown.map((item) => ({
    name:
      item.category === 'Household & Daily Needs'
        ? 'Household'
        : item.category === 'Education & Children'
          ? 'Education'
          : item.category === 'Clothing & Warmth'
            ? 'Warmth'
            : 'Food',
    fullName: item.category,
    count: item.count,
  }));

  const pipelineData = stats.statusPipeline.map((item) => ({
    name: item.status,
    count: item.count,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
        <div className="mb-4">
          <h3 className="font-display text-base font-semibold text-[#0F172A]">
            Donations by Category
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live distribution across all four supported rescue categories
          </p>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748B', fontSize: 12 }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {categoryData.map((entry, idx) => (
                  <Cell key={entry.fullName} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
        <div className="mb-4">
          <h3 className="font-display text-base font-semibold text-[#0F172A]">
            Workflow Status Pipeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Available through receiver-confirmed Delivered state
          </p>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748B', fontSize: 12 }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="#0D9488" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
