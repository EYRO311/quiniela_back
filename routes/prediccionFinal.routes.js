import { Router } from 'express'
import { getPrediccionFinal, upsertPrediccionFinal, FECHA_LIMITE_PREDICCION_FINAL } from '../services/prediccionFinal.service.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { idUsuario, idQuiniela } = req.query
    if (!idUsuario || !idQuiniela) {
      return res.status(400).json({ error: 'idUsuario e idQuiniela son requeridos' })
    }
    const prediccion = await getPrediccionFinal(idUsuario, idQuiniela)
    res.json({ prediccion, fechaLimite: FECHA_LIMITE_PREDICCION_FINAL })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { idQuiniela, idUsuario, idCampeon, idSubcampeon } = req.body
    if (!idQuiniela || !idUsuario || !idCampeon || !idSubcampeon) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' })
    }
    const prediccion = await upsertPrediccionFinal({ idQuiniela, idUsuario, idCampeon, idSubcampeon })
    res.status(201).json({ prediccion })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
