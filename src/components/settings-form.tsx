'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUserSettings } from '@/lib/actions/user'
import type { UserPreferences } from '@/lib/types'

interface SettingsFormProps {
  settings: UserPreferences | null
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  
  const [dailyTaskLimit, setDailyTaskLimit] = useState(
    settings?.dailyTaskLimit?.toString() || '3'
  )
  const [vitalTaskLimit, setVitalTaskLimit] = useState(
    settings?.vitalTaskLimit?.toString() || ''
  )
  const [importantTaskLimit, setImportantTaskLimit] = useState(
    settings?.importantTaskLimit?.toString() || ''
  )
  const [notImportantTaskLimit, setNotImportantTaskLimit] = useState(
    settings?.notImportantTaskLimit?.toString() || ''
  )
  const [somedayTaskLimit, setSomedayTaskLimit] = useState(
    settings?.somedayTaskLimit?.toString() || ''
  )
  const [dailySummaryTime, setDailySummaryTime] = useState(
    settings?.dailySummaryTime || '07:00'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    startTransition(async () => {
      await updateUserSettings({
        dailyTaskLimit: parseInt(dailyTaskLimit) || 3,
        vitalTaskLimit: vitalTaskLimit ? parseInt(vitalTaskLimit) : null,
        importantTaskLimit: importantTaskLimit ? parseInt(importantTaskLimit) : null,
        notImportantTaskLimit: notImportantTaskLimit ? parseInt(notImportantTaskLimit) : null,
        somedayTaskLimit: somedayTaskLimit ? parseInt(somedayTaskLimit) : null,
        dailySummaryTime,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Overall Daily Limit */}
      <div className="space-y-2">
        <Label htmlFor="dailyTaskLimit">
          Total daily task limit
        </Label>
        <Input
          id="dailyTaskLimit"
          type="number"
          min="1"
          max="20"
          value={dailyTaskLimit}
          onChange={(e) => setDailyTaskLimit(e.target.value)}
          className="w-24"
        />
        <p className="text-xs text-muted-foreground">
          Maximum tasks you want to see scheduled for any single day
        </p>
      </div>

      {/* Per-Priority Limits */}
      <div className="space-y-4">
        <Label>Per-priority limits (optional)</Label>
        <p className="text-xs text-muted-foreground -mt-2">
          Leave empty to use only the total daily limit
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vitalLimit" className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Vital
            </Label>
            <Input
              id="vitalLimit"
              type="number"
              min="0"
              max="10"
              placeholder="No limit"
              value={vitalTaskLimit}
              onChange={(e) => setVitalTaskLimit(e.target.value)}
              className="w-24"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="importantLimit" className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Important
            </Label>
            <Input
              id="importantLimit"
              type="number"
              min="0"
              max="10"
              placeholder="No limit"
              value={importantTaskLimit}
              onChange={(e) => setImportantTaskLimit(e.target.value)}
              className="w-24"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notImportantLimit" className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Not Important
            </Label>
            <Input
              id="notImportantLimit"
              type="number"
              min="0"
              max="10"
              placeholder="No limit"
              value={notImportantTaskLimit}
              onChange={(e) => setNotImportantTaskLimit(e.target.value)}
              className="w-24"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="somedayLimit" className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Someday
            </Label>
            <Input
              id="somedayLimit"
              type="number"
              min="0"
              max="10"
              placeholder="No limit"
              value={somedayTaskLimit}
              onChange={(e) => setSomedayTaskLimit(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
      </div>

      {/* Daily Summary Time */}
      <div className="space-y-2">
        <Label htmlFor="summaryTime">Daily summary email time</Label>
        <Input
          id="summaryTime"
          type="time"
          value={dailySummaryTime}
          onChange={(e) => setDailySummaryTime(e.target.value)}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          When to receive your daily task summary email
        </p>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isPending} className="gap-2">
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved!
          </>
        ) : isPending ? (
          'Saving...'
        ) : (
          'Save Settings'
        )}
      </Button>
    </form>
  )
}
