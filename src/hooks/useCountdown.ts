import { useState, useEffect } from 'react'

export function useCountdown(targetDate = '2026-08-13T12:45:00') {
  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    mins: '00',
    secs: '00',
    diff: 0,
    done: false
  })

  useEffect(() => {
    const target = new Date(targetDate).getTime()

    const update = () => {
      const now = new Date().getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: '00', hours: '00', mins: '00', secs: '00', diff: 0, done: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({
        days: days < 10 ? `0${days}` : String(days),
        hours: hours < 10 ? `0${hours}` : String(hours),
        mins: mins < 10 ? `0${mins}` : String(mins),
        secs: secs < 10 ? `0${secs}` : String(secs),
        diff,
        done: false
      })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}