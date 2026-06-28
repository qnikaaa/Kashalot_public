interface WhaleIconProps {
  color: string      // HEX-цвет
  size?: number
}

/** Легкий SVG-силуэт кашалота-техники, окрашенный в цвет конкретной модели */
export function WhaleIcon({ color, size = 28 }: WhaleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="headlightGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF7B8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#FDE68A" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Мягкое свечение фары */}
      <circle cx="16" cy="32" r="13" fill="url(#headlightGlow)" />

      {/* Платформа-поплавок */}
      <path
        d="M14 39 C27 49 62 49 80 39 C75 53 28 56 12 45 C10 43 11 40 14 39Z"
        fill={color}
        opacity="0.7"
      />

      {/* Корпус */}
      <path
        d="M19 25 H65 C74 25 82 32 84 40 C68 48 35 49 15 39 C12 34 14 28 19 25Z"
        fill={color}
      />

      {/* Нос и фара */}
      <path d="M16 29 C10 31 9 37 15 40 C19 37 19 32 16 29Z" fill={color} opacity="0.85" />
      <circle cx="16" cy="33" r="3.2" fill="#FFF7B8" />
      <circle cx="16" cy="33" r="1.7" fill="#FFFFFF" />

      {/* Сиденье */}
      <rect x="47" y="18" width="20" height="8" rx="4" fill="#15151F" />
      <rect x="50" y="14" width="14" height="5" rx="2.5" fill="#15151F" opacity="0.85" />

      {/* Черный руль */}
      <path
        d="M66 19 C70 10 78 10 82 17"
        stroke="#15151F"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M79 16 H90"
        stroke="#15151F"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Небольшие детали */}
      <circle cx="30" cy="36" r="2.5" fill="#FFFFFF" opacity="0.45" />
      <path
        d="M28 42 C39 45 58 44 71 39"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  )
}
