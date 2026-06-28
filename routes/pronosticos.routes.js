import { Router } from 'express'
import { getPronosticos, getPronosticosQuiniela, upsertPronostico } from '../services/pronosticos.service.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { idUsuario, idQuiniela } = req.query
    if (!idUsuario || !idQuiniela) {
      return res.status(400).json({ error: 'idUsuario e idQuiniela son requeridos' })
    }
    const pronosticos = await getPronosticos(idUsuario, idQuiniela)
    res.json({ pronosticos })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/quiniela/:idQuiniela', async (req, res) => {
  try {
    const pronosticos = await getPronosticosQuiniela(req.params.idQuiniela)
    res.json({ pronosticos })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { idQuiniela, idUsuario, idPartido, golesAPred, golesBPred, penalAPred, penalBPred } = req.body
    if (!idQuiniela || !idUsuario || !idPartido || golesAPred === undefined || golesBPred === undefined) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' })
    }
    const pronostico = await upsertPronostico({
      idQuiniela,
      idUsuario,
      idPartido,
      golesAPred: Number(golesAPred),
      golesBPred: Number(golesBPred),
      penalAPred: penalAPred === undefined || penalAPred === null ? null : Number(penalAPred),
      penalBPred: penalBPred === undefined || penalBPred === null ? null : Number(penalBPred)
    })
    res.status(201).json({ pronostico })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
