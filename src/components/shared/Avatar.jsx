import React from 'react'

// Sizes: 'sm' = w-8 h-8, 'md' = w-10 h-10, 'lg' = w-14 h-14
const SIZE = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-2xl',
}

const Avatar = React.memo(function Avatar({ username, size = 'sm', className = '', onClick }) {
  const initials = username?.[0]?.toUpperCase() ?? '?'
  const sizeClass = SIZE[size] ?? SIZE.sm
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={`${sizeClass} rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center font-bold text-white shrink-0 ${className} ${onClick ? 'hover:opacity-75 transition-opacity' : ''}`}
    >
      {initials}
    </Tag>
  )
})

export default Avatar
