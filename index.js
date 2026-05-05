import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PORT } from './config.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import quinielaRoutes from './routes/quiniela.routes.js'
import partidosRoutes from './routes/partidos.routes.js'
import pronosticosRoutes from './routes/pronosticos.routes.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => res.send('Quiniela API'))

app.use(authRoutes)
app.use('/usuarios', userRoutes)
app.use('/quinielas', quinielaRoutes)
app.use('/partidos', partidosRoutes)
app.use('/pronosticos', pronosticosRoutes)

app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`))
