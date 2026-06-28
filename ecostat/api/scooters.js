import { getScootersWithCache } from '../server/adminProxy.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, cacheStatus } = await getScootersWithCache()
    res.setHeader('X-Cache', cacheStatus)
    res.status(200).json(data)
  } catch (error) {
    console.error('Failed to fetch scooters from admin:', error.message)
    res.status(502).json({
      error: 'Failed to fetch scooters from admin',
      details: error.message,
      diagnostics: error.diagnostics,
    })
  }
}
