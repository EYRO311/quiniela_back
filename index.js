import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import quinielaRoutes from './routes/quiniela.routes.js'
import partidosRoutes from './routes/partidos.routes.js'
import pronosticosRoutes from './routes/pronosticos.routes.js'

const corsOptions = {
  origin: [
    'https://quiniela-front-ten.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'cache-control',
    'pragma',
    'Expires',
    'x-amz-tagging'
  ],
  credentials: true
}

const PORT = process.env.PORT || 3000

const app = express()
app.use(cors(corsOptions))
app.use(express.json())

app.get('/', (req, res) => res.send('Quiniela API'))

app.use(authRoutes)
app.use('/usuarios', userRoutes)
app.use('/quinielas', quinielaRoutes)
app.use('/partidos', partidosRoutes)
app.use('/pronosticos', pronosticosRoutes)

app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`))
