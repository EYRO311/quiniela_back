import { Router } from 'express'
import { UserRepository } from '../repositories/user.repository.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { identifier, username, password } = req.body
    const user = await UserRepository.login({ identifier: identifier ?? username, password })
    res.json({ user })
  } catch (error) {
    res.status(401).json({ error: error.message })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { username, password, nombre } = req.body
    const id = await UserRepository.create({ username, password, nombre })
    res.status(201).json({ id })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada' })
})

export default router
