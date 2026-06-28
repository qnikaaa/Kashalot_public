import dotenv from 'dotenv'
import express from 'express'
import { getCacheInfo, getScootersWithCache, inspectColumns } from './adminProxy.js'

dotenv.config({ path: new URL('.env', import.meta.url) })

const app = express()
const PORT = Number(process.env.SERVER_PORT || 3001)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    cache: getCacheInfo(),
  })
})

app.get('/api/debug/columns', async (_req, res) => {
  try {
    res.json(await inspectColumns())
  } catch (error) {
    res.status(502).json({
      error: 'Failed to inspect DataTables columns',
      details: error.message,
      diagnostics: error.diagnostics,
    })
  }
})

app.get('/api/scooters', async (_req, res) => {
  try {
    const { data, cacheStatus } = await getScootersWithCache()
    res.setHeader('X-Cache', cacheStatus)
    res.json(data)
  } catch (error) {
    console.error('Failed to fetch scooters from admin:', error.message)
    res.status(502).json({
      error: 'Failed to fetch scooters from admin',
      details: error.message,
      diagnostics: error.diagnostics,
    })
  }
})

app.listen(PORT, () => {
  console.log(`Backend proxy listening on http://127.0.0.1:${PORT}`)
})
