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
      viewBox="0 0 128 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="kashalotHeadlightGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#DFF6FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#DFF6FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Нижняя лыжня: окрашивается тем же цветом, что и корпус */}
      <path
        d="M5 63 C20 52 49 47 84 51 C105 53 116 56 122 61 C108 72 61 81 18 75 C7 73 1 69 5 63Z"
        fill={color}
        opacity="0.92"
      />
      <path
        d="M15 65 C33 60 76 58 106 61"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M17 67 C28 70 42 70 54 66" stroke="#0F172A" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
      <path d="M66 64 C78 67 91 67 103 63" stroke="#0F172A" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />

      {/* Задняя гусеница / колесный блок */}
      <path
        d="M76 48 H108 C116 48 122 54 122 62 C122 70 116 76 108 76 H82 C74 76 69 70 69 62 C69 54 72 48 76 48Z"
        fill="#171827"
      />
      <path
        d="M82 53 H108 C113 53 116 57 116 62 C116 67 113 71 108 71 H83 C78 71 75 67 75 62 C75 57 78 53 82 53Z"
        fill="#2A2A36"
      />

      {/* Основной корпус: вся окрашиваемая часть */}
      <path
        d="M35 24 C46 19 84 18 105 28 C113 32 117 39 116 47 C104 53 63 55 31 48 C22 46 18 41 21 34 C23 29 28 26 35 24Z"
        fill={color}
      />
      <path
        d="M39 30 C55 27 84 27 102 33"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Передняя маска с фарой */}
      <path
        d="M24 28 C15 31 12 42 19 48 C29 50 38 45 39 36 C38 29 32 26 24 28Z"
        fill={color}
      />
      <ellipse cx="25" cy="38" rx="13" ry="10" fill="#FFFFFF" opacity="0.9" />
      <ellipse cx="25" cy="38" rx="9" ry="6.5" fill="#171827" />
      <ellipse cx="25" cy="38" rx="6" ry="4" fill="#F8FAFC" />
      <ellipse cx="25" cy="38" rx="17" ry="13" fill="url(#kashalotHeadlightGlow)" />

      {/* Стойка */}
      <path
        d="M35 45 C36 33 39 25 45 16"
        stroke="#171827"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M38 45 C39 34 42 26 48 17"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* Сиденье */}
      <path
        d="M58 26 C65 18 84 18 92 26 C90 32 82 36 70 35 C61 34 56 30 58 26Z"
        fill="#171827"
      />
      <path
        d="M62 26 C70 23 82 23 89 27"
        stroke="#3B3B48"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Черный руль */}
      <path
        d="M46 17 C50 8 59 7 65 15"
        stroke="#171827"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M63 14 H80"
        stroke="#171827"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M43 18 H34" stroke="#171827" strokeWidth="6" strokeLinecap="round" />
      <path d="M74 14 H84" stroke="#3B3B48" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

      {/* Декоративная светлая боковая вставка */}
      <path
        d="M43 45 C58 49 88 49 106 45"
        stroke="#F8FAFC"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="48" cy="45" r="2" fill="#171827" opacity="0.45" />
    </svg>
  )
}
