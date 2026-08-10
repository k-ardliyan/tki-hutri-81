/**
 * Server functions — Event meta, key dates, and landing highlights
 * HUT RI ke-81 · PT TKI x PT FTP
 *
 * Static data fallback until DATABASE_URL is configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { eventMeta, keyDates, landingHighlights } from '../../data/content'
// import { assertDb } from '../db' // TODO: uncomment when DB ready

// TODO: Replace with DB query when DATABASE_URL is set
export const getEventMeta = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  // return db.query.events.findFirst()
  return eventMeta
})

// TODO: Replace with DB query when DATABASE_URL is set
export const getKeyDates = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  // return db.query.keyDates.findMany({ orderBy: (t, { asc }) => [asc(t.sortOrder)] })
  return keyDates
})

// TODO: Replace with DB query when DATABASE_URL is set
export const getLandingHighlights = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  // return db.query.landingHighlights.findMany({ orderBy: (t, { asc }) => [asc(t.sortOrder)] })
  return landingHighlights
})
