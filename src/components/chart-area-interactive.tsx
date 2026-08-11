/**
 * ChartAreaInteractive — area chart aktivitas (block dashboard-01), data real.
 * Default: seri harian { date: 'YYYY-MM-DD', count } + toggle 7/30/90 hari.
 * Set `showRange={false}` utk seri mingguan/agregat tanpa filter hari (render semua titik).
 */
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart';
import { Combobox, type ComboboxOption } from '~/components/ui/combobox';
import { useIsMobile } from '~/hooks/use-mobile';

const timeRangeOptions: ComboboxOption[] = [
  { value: '90d', label: '3 bulan' },
  { value: '30d', label: '30 hari' },
  { value: '7d', label: '7 hari' },
];

import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

const chartConfig = {
  count: {
    label: 'Penilaian',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

export function ChartAreaInteractive({
  data,
  title = 'Aktivitas Penilaian',
  subtitle = 'Jumlah penilaian per hari',
  showRange = true,
}: {
  data: { date: string; count: number }[];
  title?: string;
  subtitle?: string;
  /** false = data sudah agregat (mis. per minggu) — render semua, tanpa toggle range. */
  showRange?: boolean;
}) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('30d');

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('7d');
    }
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    // Data agregat (mingguan) tanpa toggle — render semua titik apa adanya.
    if (!showRange) return data;
    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === '30d') daysToSubtract = 30;
    else if (timeRange === '7d') daysToSubtract = 7;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return data.filter((item) => new Date(item.date) >= startDate);
  }, [data, timeRange, showRange]);

  const rangeLabel =
    timeRange === '7d'
      ? '7 hari terakhir'
      : timeRange === '30d'
        ? '30 hari terakhir'
        : '3 bulan terakhir';

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">{subtitle}</span>
          <span className="@[540px]/card:hidden">{showRange ? rangeLabel : subtitle}</span>
        </CardDescription>
        <CardAction>
          {showRange ? (
            <>
              <ToggleGroup
                type="single"
                value={timeRange}
                onValueChange={setTimeRange}
                variant="outline"
                className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
              >
                <ToggleGroupItem value="90d">3 bulan</ToggleGroupItem>
                <ToggleGroupItem value="30d">30 hari</ToggleGroupItem>
                <ToggleGroupItem value="7d">7 hari</ToggleGroupItem>
              </ToggleGroup>
              <Combobox
                options={timeRangeOptions}
                value={timeRange}
                onValueChange={setTimeRange}
                showSearch={false}
                size="sm"
                triggerClassName="w-36 @[767px]/card:hidden h-8"
              />
            </>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-count)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={fmtShort}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => fmtShort(String(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="count"
              type="natural"
              fill="url(#fillCount)"
              stroke="var(--color-count)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
