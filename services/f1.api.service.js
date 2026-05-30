const JOLPICA = 'https://api.jolpi.ca/ergast/f1'

async function fetchJSON (url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`F1 API error ${res.status}: ${url}`)
  return res.json()
}

export async function fetchDriverStandings (year = 2026) {
  const data = await fetchJSON(`${JOLPICA}/${year}/last/driverstandings.json`)
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
  return list.map(s => ({
    posicion: parseInt(s.position),
    puntos: parseFloat(s.points),
    victorias: parseInt(s.wins),
    piloto: {
      id: s.Driver.driverId,
      nombre: `${s.Driver.givenName} ${s.Driver.familyName}`,
      apellido: s.Driver.familyName,
      numero: s.Driver.permanentNumber ?? null,
      pais: s.Driver.nationality,
      codigo: s.Driver.code ?? null
    },
    escuderia: {
      id: s.Constructors[0]?.constructorId ?? null,
      nombre: s.Constructors[0]?.name ?? '—'
    }
  }))
}

export async function fetchConstructorStandings (year = 2026) {
  const data = await fetchJSON(`${JOLPICA}/${year}/last/constructorstandings.json`)
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  return list.map(s => ({
    posicion: parseInt(s.position),
    puntos: parseFloat(s.points),
    victorias: parseInt(s.wins),
    escuderia: {
      id: s.Constructor.constructorId,
      nombre: s.Constructor.name,
      pais: s.Constructor.nationality
    }
  }))
}

export async function fetchCalendar (year = 2026) {
  const data = await fetchJSON(`${JOLPICA}/${year}/races.json`)
  const races = data?.MRData?.RaceTable?.Races ?? []
  const now = new Date()

  return races.map(r => {
    const fechaISO = r.date + 'T' + (r.time ?? '14:00:00Z')
    const raceDate = new Date(fechaISO)
    const diffH = (raceDate.getTime() - now.getTime()) / 3600000

    let estado
    if (diffH > 3) estado = 'pendiente'
    else if (diffH >= -4) estado = 'en_vivo'
    else estado = 'finalizada'

    return {
      round: parseInt(r.round),
      nombre_gp: r.raceName,
      circuito: r.Circuit.circuitName,
      pais: r.Circuit.Location.country,
      ciudad: r.Circuit.Location.locality,
      fecha_carrera: fechaISO,
      fecha_clasificacion: r.Qualifying
        ? r.Qualifying.date + 'T' + (r.Qualifying.time ?? '14:00:00Z')
        : null,
      fecha_sprint: r.Sprint
        ? r.Sprint.date + 'T' + (r.Sprint.time ?? '12:00:00Z')
        : null,
      estado
    }
  })
}

export async function fetchLastResults (year = 2026) {
  const data = await fetchJSON(`${JOLPICA}/${year}/last/results.json`)
  const race = data?.MRData?.RaceTable?.Races?.[0]
  if (!race) return null

  return {
    round: parseInt(race.round),
    nombre_gp: race.raceName,
    circuito: race.Circuit.circuitName,
    pais: race.Circuit.Location.country,
    fecha: race.date,
    resultados: (race.Results ?? []).slice(0, 10).map(r => ({
      posicion: parseInt(r.position),
      codigo: r.Driver.code ?? r.Driver.driverId,
      piloto: `${r.Driver.givenName} ${r.Driver.familyName}`,
      numero: r.Driver.permanentNumber ?? null,
      escuderia: r.Constructor.name,
      puntos: parseFloat(r.points),
      tiempo: r.Time?.time ?? r.status,
      vuelta_rapida: r.FastestLap?.rank === '1'
    }))
  }
}
