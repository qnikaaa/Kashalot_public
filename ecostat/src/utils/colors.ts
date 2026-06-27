// Маппинг русских названий цветов из CSV в HEX
// Если появятся новые цвета — просто добавь их сюда
const COLOR_MAP: Record<string, string> = {
  'Малиновый':  '#D63864',
  'Голубой':    '#4DA6E8',
  'Салатовый':  '#7EC84A',
  'Оранжевый':  '#F97316',
  'Синий':      '#3B5BDB',
  'Бирюзовый':  '#0EA5B0',
  'Фиолетовый': '#8B5CF6',
  'Жёлтый':     '#EAB308',
  'Красный':    '#EF4444',
  'Зелёный':    '#22C55E',
  'Белый':      '#E2E8F0',
  'Чёрный':     '#1E293B',
}

const DEFAULT_COLOR = '#94A3B8'

/** Возвращает HEX-цвет по русскому названию из CSV */
export function getScooterColor(colorName: string): string {
  return COLOR_MAP[colorName] ?? DEFAULT_COLOR
}

/** Возвращает светлый вариант цвета для фона карточки */
export function getScooterColorLight(colorName: string): string {
  const hex = getScooterColor(colorName)
  return hex + '22' // 13% прозрачность
}
