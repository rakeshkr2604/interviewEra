'use client'
import Image from 'next/image'
import { CheckCircle } from 'lucide-react'
import { useState } from 'react'
import type { Interviewer } from '@/lib/config/interviewers'

interface AvatarCardProps {
  avatar: Interviewer
  isSelected: boolean
  onSelect: (id: Interviewer['id']) => void
}

export function AvatarCard({ avatar, isSelected, onSelect }: AvatarCardProps) {
  const [imgSrc, setImgSrc] = useState(avatar.avatarImage)

  return (
    <button
      onClick={() => onSelect(avatar.id)}
      className={`relative w-full rounded-2xl border p-6 text-left transition-all duration-200
        ${isSelected
          ? 'border-(--accent-primary) bg-(--accent-primary)/10 shadow-lg'
          : 'border-(--card-border) bg-(--card-bg) hover:border-(--accent-primary)/50'
        }`}
    >
      {isSelected && (
        <CheckCircle
          size={20}
          className="absolute right-4 top-4 text-(--accent-primary)"
        />
      )}
      <div className="flex items-center gap-4">
        <Image
          src={imgSrc}
          alt={`${avatar.name} avatar`}
          width={56}
          height={56}
          className="h-14 w-14 rounded-full object-cover object-center ring-1 ring-(--card-border)"
          onError={(event) => {
            if (imgSrc !== '/default-avatar.png') {
              setImgSrc('/default-avatar.png')
            } else {
              event.currentTarget.style.opacity = '0.5'
            }
          }}
        />
        <div>
          <p className="font-semibold text-(--text-primary)">{avatar.name}</p>
          <p className="text-sm text-(--text-secondary)">{avatar.role}</p>
        </div>
      </div>
    </button>
  )
}
