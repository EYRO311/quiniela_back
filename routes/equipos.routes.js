import { Router } from 'express'
import { getEquipos, getJugadoresPorEquipo } from '../services/equipos.service.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const equipos = await getEquipos()
    res.json({ equipos })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id/jugadores', async (req, res) => {
  try {
    const jugadores = await getJugadoresPorEquipo(req.params.id)
    res.json({ jugadores })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
