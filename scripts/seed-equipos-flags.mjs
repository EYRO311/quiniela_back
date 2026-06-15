import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EQUIPOS = [
  ['Mexico', 'MEX', 'mx'],
  ['South Africa', 'RSA', 'za'],
  ['Korea Republic', 'KOR', 'kr'],
  ['Czechia', 'CZE', 'cz'],
  ['Canada', 'CAN', 'ca'],
  ['Bosnia and Herzegovina', 'BIH', 'ba'],
  ['Qatar', 'QAT', 'qa'],
  ['Switzerland', 'SUI', 'ch'],
  ['Brazil', 'BRA', 'br'],
  ['Morocco', 'MAR', 'ma'],
  ['Haiti', 'HAI', 'ht'],
  ['Scotland', 'SCO', 'gb-sct'],
  ['United States', 'USA', 'us'],
  ['Paraguay', 'PAR', 'py'],
  ['Australia', 'AUS', 'au'],
  ['Turkey', 'TUR', 'tr'],
  ['Germany', 'GER', 'de'],
  ['Curaçao', 'CUW', 'cw'],
  ['Ivory Coast', 'CIV', 'ci'],
  ['Ecuador', 'ECU', 'ec'],
  ['Netherlands', 'NED', 'nl'],
  ['Japan', 'JPN', 'jp'],
  ['Sweden', 'SWE', 'se'],
  ['Tunisia', 'TUN', 'tn'],
  ['Belgium', 'BEL', 'be'],
  ['Egypt', 'EGY', 'eg'],
  ['Iran', 'IRN', 'ir'],
  ['New Zealand', 'NZL', 'nz'],
  ['Spain', 'ESP', 'es'],
  ['Cape Verde', 'CPV', 'cv'],
  ['Saudi Arabia', 'KSA', 'sa'],
  ['Uruguay', 'URU', 'uy'],
  ['France', 'FRA', 'fr'],
  ['Senegal', 'SEN', 'sn'],
  ['Iraq', 'IRQ', 'iq'],
  ['Norway', 'NOR', 'no'],
  ['Argentina', 'ARG', 'ar'],
  ['Algeria', 'ALG', 'dz'],
  ['Austria', 'AUT', 'at'],
  ['Jordan', 'JOR', 'jo'],
  ['Portugal', 'POR', 'pt'],
  ['DR Congo', 'COD', 'cd'],
  ['Uzbekistan', 'UZB', 'uz'],
  ['Colombia', 'COL', 'co'],
  ['England', 'ENG', 'gb-eng'],
  ['Croatia', 'CRO', 'hr'],
  ['Ghana', 'GHA', 'gh'],
  ['Panama', 'PAN', 'pa']
]

const norm = t => t.toLowerCase().trim()

const { data: equipos, error } = await supabase
  .schema('quiniela')
  .from('equipos')
  .select('id_equipo, nombre_pais')

if (error) throw error

const sinMatch = []
let actualizados = 0

for (const equipo of equipos) {
  const fila = EQUIPOS.find(([nombre]) => norm(nombre) === norm(equipo.nombre_pais))
  if (!fila) {
    sinMatch.push(equipo.nombre_pais)
    continue
  }
  const [, codigo_fifa, codigo_iso2] = fila
  const { error: updError } = await supabase
    .schema('quiniela')
    .from('equipos')
    .update({
      codigo_fifa,
      codigo_iso2,
      bandera_url: `https://flagcdn.com/w80/${codigo_iso2}.png`
    })
    .eq('id_equipo', equipo.id_equipo)

  if (updError) {
    console.error(`Error actualizando ${equipo.nombre_pais}:`, updError.message)
  } else {
    actualizados++
  }
}

console.log(`Actualizados: ${actualizados}/${equipos.length}`)
if (sinMatch.length) console.log('Sin match:', sinMatch)
