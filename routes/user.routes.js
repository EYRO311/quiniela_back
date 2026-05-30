import { Router } from 'express'
import { UserRepository } from '../repositories/user.repository.js'
import { getUsuarioInfo } from '../services/usuario.service.js'

const router = Router()

router.get('/:id', async (req, res) => {
  try {
    const data = await getUsuarioInfo(req.params.id)
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { nombre, correo, username, telefono, futbol_f1: futbolF1 } = req.body
    const user = await UserRepository.update({ id: req.params.id, nombre, correo, username, telefono, futbolF1 })
    res.json({ user })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
