'use client'

import { Beef, PiggyBank, Rabbit, Package, Utensils, Heart, Drumstick } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

// Animal type icons
export function BeefIcon(props: LucideProps) {
  return <Beef {...props} />
}

export function PorkIcon(props: LucideProps) {
  return <PiggyBank {...props} />
}

export function LambIcon(props: LucideProps) {
  // Using Rabbit as a stand-in since there's no sheep icon in Lucide
  return <Rabbit {...props} />
}

export function GoatIcon(props: LucideProps) {
  // Using a stylized icon for goat
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M12 2c-2 0-3.5 1.5-4 3l-1 4c-.5 2 .5 4 2 5l1 1v5h2v-4h2v4h2v-5l1-1c1.5-1 2.5-3 2-5l-1-4c-.5-1.5-2-3-4-3z" />
      <path d="M8 5l-2-2" />
      <path d="M16 5l2-2" />
    </svg>
  )
}

// Cut type icons
export function SteakIcon(props: LucideProps) {
  return <Utensils {...props} />
}

export function GroundMeatIcon(props: LucideProps) {
  return <Package {...props} />
}

export function SausageIcon(props: LucideProps) {
  return <Drumstick {...props} />
}

export function OrgansIcon(props: LucideProps) {
  return <Heart {...props} />
}

// Helper to get animal icon component by type
export function getAnimalIcon(type: string, props: LucideProps = {}) {
  switch (type) {
    case 'beef':
      return <BeefIcon {...props} />
    case 'pork':
      return <PorkIcon {...props} />
    case 'lamb':
      return <LambIcon {...props} />
    case 'goat':
      return <GoatIcon {...props} />
    default:
      return <BeefIcon {...props} />
  }
}

// Icon data for use in non-React contexts (data structures)
export const ANIMAL_ICON_NAMES = {
  beef: 'Beef',
  pork: 'PiggyBank',
  lamb: 'Rabbit',
  goat: 'Goat',
} as const

export const SECTION_ICON_NAMES = {
  steaks: 'Utensils',
  roasts: 'Package',
  ribs: 'Bone',
  bacon: 'Bacon',
  sausage: 'Sausage',
  ground: 'Package',
  other: 'MoreHorizontal',
  organs: 'Heart',
} as const
