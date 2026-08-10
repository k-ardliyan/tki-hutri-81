/**
 * ChartBarStrength — bar chart Kekuatan 5R per kategori (recharts + ui/chart).
 */
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart';

const chartConfig = {
  avg: {
    label: 'Rata-rata',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

export function ChartBarStrength({
  data,
  title = 'Kekuatan 5R',
  subtitle = 'Rata-rata semua penilaian',
}: {
  data: { label: string; avg: number }[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ top: 4, left: 0, right: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="avg" fill="var(--color-avg)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
