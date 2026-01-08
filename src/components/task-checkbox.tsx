'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompletionStar } from './completion-star'

interface TaskCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  priority: number
  disabled?: boolean
}

export function TaskCheckbox({
  checked,
  onCheckedChange,
  priority,
  disabled,
}: TaskCheckboxProps) {
  const [showStar, setShowStar] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = () => {
    if (disabled || isAnimating) return

    if (!checked) {
      setIsAnimating(true)
      setShowStar(true)
      // Delay the actual completion to let animation play
      setTimeout(() => {
        onCheckedChange(true)
      }, 400)
    } else {
      onCheckedChange(false)
    }
  }

  const priorityColors = {
    1: 'border-red-400 hover:border-red-500',
    2: 'border-amber-400 hover:border-amber-500',
    3: 'border-indigo-400 hover:border-indigo-500',
    4: 'border-slate-300 hover:border-slate-400',
  }

  const checkedColors = {
    1: 'bg-red-500 border-red-500',
    2: 'bg-amber-500 border-amber-500',
    3: 'bg-indigo-500 border-indigo-500',
    4: 'bg-slate-400 border-slate-400',
  }

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        whileTap={{ scale: 0.9 }}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          checked
            ? checkedColors[priority as keyof typeof checkedColors]
            : priorityColors[priority as keyof typeof priorityColors],
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </motion.button>

      <CompletionStar
        isVisible={showStar}
        onComplete={() => {
          setShowStar(false)
          setIsAnimating(false)
        }}
      />
    </div>
  )
}
