import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import RoomFormFlow from '../../components/5r/RoomFormFlow';
import { RoomListSkeleton } from '../../components/ui/skeletons';
import { getForms, getRooms, getSettings } from '../../server/functions/5r';

const searchSchema = z.object({
  room: z.string().optional(),
  form: z.string().optional(),
});

export const Route = createFileRoute('/audit/isi')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms, settings] = await Promise.all([getRooms(), getForms(), getSettings()]);
    return { rooms, forms, startDate: settings.startDate, endDate: settings.endDate };
  },
  component: AuditIsiPage,
  pendingComponent: RoomListSkeleton,
});

function AuditIsiPage() {
  const { rooms, forms, startDate, endDate } = Route.useLoaderData();
  const { room, form } = Route.useSearch();

  return (
    <RoomFormFlow
      rooms={rooms}
      forms={forms}
      startDate={startDate}
      endDate={endDate}
      basePath="/audit/isi"
      room={room}
      form={form}
    />
  );
}
