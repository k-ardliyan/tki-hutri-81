import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/5r')({
  beforeLoad: () => {
    throw redirect({
      to: '/live',
      search: { tab: '5r' },
    })
  },
})


