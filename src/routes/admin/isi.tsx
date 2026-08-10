import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import RoomFormFlow from '../../components/5r/RoomFormFlow';
import { getDeadline, getForms, getRooms } from '../../server/functions/5r';

const searchSchema = z.object({
  room: z.string().optional(),
  form: z.string().optional(),
});

export const Route = createFileRoute('/admin/isi')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms, dl] = await Promise.all([getRooms(), getForms(), getDeadline()]);
    return { rooms, forms, deadline: dl.deadline };
  },
  component: AdminIsiPage,
});

function AdminIsiPage() {
  const { rooms, forms, deadline } = Route.useLoaderData();
  const { room, form } = Route.useSearch();

  return (
    <RoomFormFlow
      rooms={rooms}
      forms={forms}
      deadline={deadline}
      basePath="/admin/isi"
      room={room}
      form={form}
    />
  );
}
