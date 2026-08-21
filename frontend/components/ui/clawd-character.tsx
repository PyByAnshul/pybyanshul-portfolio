'use client'

export type Activity = 'idle' | 'typing' | 'streaming' | 'scrolling' | 'error'

const activitySvg: Record<Activity, string> = {
  idle: '/clawd-svg/clawd-mini-happy.svg',
  typing: '/clawd-svg/clawd-working-typing.svg',
  streaming: '/clawd-svg/clawd-working-carrying.svg',
  scrolling: '/clawd-svg/clawd-working-sweeping.svg',
  error: '/clawd-svg/clawd-error.svg',
}

/**
 * Renders the clawd mascot SVG for the current user activity.
 * Falls back to "idle" for unknown activities.
 */
export default function ClawdCharacter({ activity = 'idle' }: { activity?: Activity }) {
  const svgPath = activitySvg[activity] ?? activitySvg.idle
  return (
    <img
      src={svgPath}
      alt=""
      aria-hidden="true"
      className="clawd-character"
      loading="eager"
    />
  )
}
