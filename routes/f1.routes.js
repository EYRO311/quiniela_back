import { Router } from 'express'
import { getPilotos, getEscuderias, getCarreras, getCampeonatoPilotos } from '../services/f1.service.js'

const router = Router()

router.get('/pilotos', async (req, res) => {
  try {
    const pilotos = await getPilotos()
    res.json({ pilotos })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/escuderias', async (req, res) => {
  try {
    const escuderias = await getEscuderias()
    res.json({ escuderias })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/carreras', async (req, res) => {
  try {
    const carreras = await getCarreras()
    res.json({ carreras })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/campeonato', async (req, res) => {
  try {
    const pilotos = await getCampeonatoPilotos()
    res.json({ pilotos })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
