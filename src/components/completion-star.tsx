'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'

interface CompletionStarProps {
  isVisible: boolean
  onComplete: () => void
}

export function CompletionStar({ isVisible, onComplete }: CompletionStarProps) {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 360) / 8,
  }))

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible z-50">
          {/* Central star */}
          <motion.div
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: [0, 1.5, 1], rotate: [0, 180, 360] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute"
          >
            <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
          </motion.div>

          {/* Particle burst */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((particle.angle * Math.PI) / 180) * 40,
                y: Math.sin((particle.angle * Math.PI) / 180) * 40,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 0.5,
                ease: 'easeOut',
                delay: 0.1,
              }}
              className="absolute"
            >
              <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
            </motion.div>
          ))}

          {/* Sparkle ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute w-8 h-8 rounded-full border-2 border-amber-400"
          />
        </div>
      )}
    </AnimatePresence>
  )
}
