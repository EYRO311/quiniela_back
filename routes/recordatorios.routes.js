import { Router } from 'express'
import { enviarRecordatoriosProximoPartido } from '../services/recordatorios.service.js'
import { esSuperAdmin } from '../services/resultados.service.js'

const router = Router()

async function handleRecordatorios (req, res) {
  try {
    const cronAuth = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
    if (!cronAuth) {
      const idUsuario = req.body?.idUsuario || req.query?.idUsuario
      if (!idUsuario || !(await esSuperAdmin(idUsuario))) {
        return res.status(403).json({ error: 'No autorizado' })
      }
    }
    const resultado = await enviarRecordatoriosProximoPartido()
    res.json(resultado)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

router.get('/proximo-partido', handleRecordatorios)
router.post('/proximo-partido', handleRecordatorios)

export default router
