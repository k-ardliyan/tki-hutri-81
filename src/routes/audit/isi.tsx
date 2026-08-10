import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import RoomFormFlow from '../../components/5r/RoomFormFlow';
import { getDeadline, getForms, getRooms } from '../../server/functions/5r';

const searchSchema = z.object({
  room: z.string().optional(),
  form: z.string().optional(),
});

export const Route = createFileRoute('/audit/isi')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms, dl] = await Promise.all([getRooms(), getForms(), getDeadline()]);
    return { rooms, forms, deadline: dl.deadline };
  },
  component: AuditIsiPage,
});

function AuditIsiPage() {
  const { rooms, forms, deadline } = Route.useLoaderData();
  const { room, form } = Route.useSearch();

  return (
    <RoomFormFlow
      rooms={rooms}
      forms={forms}
      deadline={deadline}
      basePath="/audit/isi"
      room={room}
      form={form}
    />
  );
}
