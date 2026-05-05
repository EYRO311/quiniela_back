import { Router } from 'express'
import { UserRepository } from '../repositories/user.repository.js'
import { getUsuarioInfo } from '../services/usuario.service.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await UserRepository.login({ username, password })
    res.json({ user })
  } catch (error) {
    res.status(401).json({ error: error.message })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    const id = await UserRepository.create({ username, password })
    res.status(201).json({ id })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada' })
})

router.get('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = await getUsuarioInfo(id)
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
