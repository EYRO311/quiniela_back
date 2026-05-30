import { Router } from 'express'
import {
  getPilotos,
  getEscuderias,
  getCarreras,
  getCampeonatoPilotos,
  getStandingsPilotos,
  getStandingsConstructores,
  getCalendarioAPI,
  getUltimoResultado,
  getProximaCarrera,
  getPronosticosF1,
  upsertPronosticoF1,
  syncCarrerasFromAPI
} from '../services/f1.service.js'

const router = Router()

// ── Datos desde DB ──────────────────────────────────
router.get('/pilotos', async (req, res) => {
  try { res.json({ pilotos: await getPilotos() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/escuderias', async (req, res) => {
  try { res.json({ escuderias: await getEscuderias() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/carreras', async (req, res) => {
  try { res.json({ carreras: await getCarreras() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/campeonato', async (req, res) => {
  try { res.json({ pilotos: await getCampeonatoPilotos() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Datos desde API Jolpica (tiempo real) ────────────
router.get('/standings/pilotos', async (req, res) => {
  try { res.json({ standings: await getStandingsPilotos() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/standings/constructores', async (req, res) => {
  try { res.json({ standings: await getStandingsConstructores() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/calendario', async (req, res) => {
  try { res.json({ carreras: await getCalendarioAPI() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/ultimo-resultado', async (req, res) => {
  try { res.json({ resultado: await getUltimoResultado() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/proximo', async (req, res) => {
  try { res.json({ carrera: await getProximaCarrera() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/pronosticos', async (req, res) => {
  const { idUsuario, idQuiniela } = req.query
  if (!idUsuario || !idQuiniela) return res.status(400).json({ error: 'idUsuario e idQuiniela requeridos' })
  try { res.json({ pronosticos: await getPronosticosF1(idUsuario, idQuiniela) }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/pronosticos', async (req, res) => {
  try { res.json({ pronostico: await upsertPronosticoF1(req.body) }) } catch (e) { res.status(400).json({ error: e.message }) }
})

router.post('/sync-carreras', async (req, res) => {
  try { res.json(await syncCarrerasFromAPI()) } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
