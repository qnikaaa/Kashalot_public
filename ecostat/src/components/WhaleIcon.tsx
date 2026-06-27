interface WhaleIconProps {
  color: string      // HEX-цвет
  size?: number
}

/** SVG-иконка кашалота, окрашенная в цвет самоката */
export function WhaleIcon({ color, size = 28 }: WhaleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Тело кашалота */}
      <ellipse cx="30" cy="34" rx="22" ry="14" fill={color} />
      {/* Голова — характерный квадратный лоб кашалота */}
      <rect x="6" y="24" width="18" height="18" rx="6" fill={color} />
      {/* Хвост */}
      <path
        d="M50 30 C56 24 62 20 62 28 C62 34 56 36 50 34Z"
        fill={color}
        opacity="0.85"
      />
      <path
        d="M50 38 C56 44 62 46 62 38 C62 32 56 32 50 34Z"
        fill={color}
        opacity="0.85"
      />
      {/* Плавник */}
      <path
        d="M32 22 C34 16 40 14 42 20 L36 24Z"
        fill={color}
        opacity="0.8"
      />
      {/* Глаз */}
      <circle cx="13" cy="33" r="2.5" fill="white" opacity="0.9" />
      <circle cx="13" cy="33" r="1.2" fill="#0a0a0f" />
      {/* Улыбка */}
      <path
        d="M10 40 Q16 44 22 40"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
        fill="none"
      />
    </svg>
  )
}
