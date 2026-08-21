'use client'

import { useCallback, useEffect, useRef } from 'react'

const KEYBOARD_SOUND = '/sounds/creatorshome-keyboard-click-327728.mp3'
const MOUSE_SOUND = '/sounds/soundreality-sound-of-mouse-click-4-478760.mp3'
const SOUND_POOL_SIZE = 4

function createSoundPool(source: string, volume: number) {
  return Array.from({ length: SOUND_POOL_SIZE }, () => {
    const audio = new Audio(source)
    audio.preload = 'auto'
    audio.volume = volume
    return audio
  })
}

/** Plays the supplied keyboard and mouse sounds for all page interactions. */
export function useInteractionSounds() {
  const keyboardSoundsRef = useRef<HTMLAudioElement[]>([])
  const mouseSoundsRef = useRef<HTMLAudioElement[]>([])
  const keyboardIndexRef = useRef(0)
  const mouseIndexRef = useRef(0)

  const playKeyboardSound = useCallback(() => {
    const sounds = keyboardSoundsRef.current
    if (!sounds.length) return
    const audio = sounds[keyboardIndexRef.current++ % SOUND_POOL_SIZE]
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }, [])

  const playMouseSound = useCallback(() => {
    const sounds = mouseSoundsRef.current
    if (!sounds.length) return
    const audio = sounds[mouseIndexRef.current++ % SOUND_POOL_SIZE]
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }, [])

  useEffect(() => {
    const keyboardSounds = createSoundPool(KEYBOARD_SOUND, 0.22)
    const mouseSounds = createSoundPool(MOUSE_SOUND, 0.3)
    keyboardSoundsRef.current = keyboardSounds
    mouseSoundsRef.current = mouseSounds

    window.addEventListener('keydown', playKeyboardSound)
    window.addEventListener('mousedown', playMouseSound)

    return () => {
      window.removeEventListener('keydown', playKeyboardSound)
      window.removeEventListener('mousedown', playMouseSound)
      ;[...keyboardSounds, ...mouseSounds].forEach((audio) => audio.pause())
      keyboardSoundsRef.current = []
      mouseSoundsRef.current = []
    }
  }, [playKeyboardSound, playMouseSound])

  return { playKeyboardSound }
}
