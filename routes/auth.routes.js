import { Router } from 'express'
import { UserRepository } from '../repositories/user.repository.js'
import { sendResetPasswordEmail } from '../services/email.service.js'

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
    const { username, password, nombre, correo } = req.body
    const id = await UserRepository.create({ username, password, nombre, correo })
    res.status(201).json({ id })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { correo } = req.body
    const result = await UserRepository.forgotPassword(correo)
    if (result?.resetUrl) {
      await sendResetPasswordEmail(correo, result.resetUrl)
    }
    res.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    await UserRepository.resetPassword(token, password)
    res.json({ message: 'Contraseña actualizada correctamente.' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada' })
})

// Sincroniza password_hash en quiniela.usuarios después de reset vía Supabase Auth
router.post('/sync-password', async (req, res) => {
  try {
    const { access_token, password } = req.body
    if (!access_token) return res.status(400).json({ error: 'Token de sesión requerido' })
    await UserRepository.syncPasswordHash(access_token, password)
    res.json({ message: 'Contraseña sincronizada correctamente' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
