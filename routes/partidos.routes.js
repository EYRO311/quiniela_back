import { Router } from 'express'
import { getPartidos, getProximoPartido } from '../services/partidos.service.js'
import { registrarResultado, esSuperAdmin } from '../services/resultados.service.js'
import { sincronizarResultados } from '../services/sync.service.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const partidos = await getPartidos()
    res.json({ partidos })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/proximo', async (req, res) => {
  try {
    const partido = await getProximoPartido()
    res.json({ partido })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id/resultado', async (req, res) => {
  try {
    const { golesA, golesB, idUsuario } = req.body
    if (golesA === undefined || golesB === undefined || !idUsuario) {
      return res.status(400).json({ error: 'golesA, golesB e idUsuario son requeridos' })
    }
    const partido = await registrarResultado({
      idPartido: req.params.id,
      golesA: Number(golesA),
      golesB: Number(golesB),
      idUsuario
    })
    res.json({ partido })
  } catch (error) {
    const status = error.message === 'No autorizado' ? 403 : 400
    res.status(status).json({ error: error.message })
  }
})

async function handleSync (req, res) {
  try {
    const cronAuth = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
    if (!cronAuth) {
      const idUsuario = req.body?.idUsuario || req.query?.idUsuario
      if (!idUsuario || !(await esSuperAdmin(idUsuario))) {
        return res.status(403).json({ error: 'No autorizado' })
      }
    }
    const resultado = await sincronizarResultados()
    res.json(resultado)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

router.get('/sync', handleSync)
router.post('/sync', handleSync)

export default router
