import { Router } from 'express'
import { QuinielaModel } from '../models/quiniela.model.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, tipo, idUsuario } = req.body
    if (!nombre || !idUsuario) {
      return res.status(400).json({ error: 'nombre e idUsuario son requeridos' })
    }
    const quiniela = await QuinielaModel.crear({
      nombre,
      descripcion,
      tipo: tipo || 'privada',
      idCreador: idUsuario
    })
    res.status(201).json({ quiniela })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/unirse', async (req, res) => {
  try {
    const { codigoAcceso, idUsuario } = req.body
    if (!codigoAcceso || !idUsuario) {
      return res.status(400).json({ error: 'codigoAcceso e idUsuario son requeridos' })
    }
    const quiniela = await QuinielaModel.unirse({ codigoAcceso, idUsuario })
    res.json({ quiniela })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/:id/participantes', async (req, res) => {
  try {
    const participantes = await QuinielaModel.getParticipantes(req.params.id)
    res.json({ participantes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id/ranking', async (req, res) => {
  try {
    const ranking = await QuinielaModel.getRanking(req.params.id)
    res.json({ ranking })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
