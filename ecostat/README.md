# Экоскат — карта кашалотов 🐋

Мобильное веб-приложение для поиска ближайших доступных кашалотов.

## Быстрый старт

```bash
npm install
npm run dev
```

Открыть в браузере: http://localhost:5173

## Структура проекта

```
src/
  components/     # UI-компоненты (Map, BottomSheet, WhaleIcon)
  hooks/          # React-хуки (useScooters, useGeolocation)
  services/       # Работа с данными (scooterService — парсинг CSV / API)
  utils/          # Вспомогательные функции (цвета, статусы, форматирование)
  types/          # TypeScript-типы
public/
  scooters.csv    # Данные о кашалотах (временно статичные)
```

## Переключение на живой API

Когда будет готов API-эндпоинт:
1. Создай файл `.env` (скопируй из `.env.example`)
2. Замени URL в `VITE_SCOOTERS_CSV_URL` на адрес API
3. При необходимости обнови `src/services/scooterService.ts`

## Deploy на Vercel

1. Залей проект на GitHub
2. Зайди на vercel.com → Import Project → выбери репозиторий
3. Готово — Vercel сам соберёт и задеплоит

## Правило доступности кашалота

Показываем только если:
- `status_group === "на линии"`
- `online === true`
- Координаты не равны 0
