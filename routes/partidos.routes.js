import { Router } from 'express'
import { getPartidos } from '../services/partidos.service.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const partidos = await getPartidos()
    res.json({ partidos })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
