/**
 * EV Charging Analytics: a Compute-to-Data algorithm.
 *
 * Reads charging-session datasets and writes aggregate KPIs only. No raw session leaves
 * the compute environment.
 *
 * Container contract (ocean-node C2D):
 *   /data/inputs/<file>                    every dataset file of the job
 *   /data/inputs/algoCustomData.json       optional parameters, e.g. { "rows": 500 }
 *   /data/outputs/                         everything written here is the job result
 *
 * Runs on node:18 with no dependencies and no network access. For a local dry run set
 * INPUT_DIR and OUTPUT_DIR.
 */
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const INPUT_DIR = process.env.INPUT_DIR || '/data/inputs'
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/data/outputs'
const CUSTOM_DATA = 'algoCustomData.json'

function log(message) {
  console.log(`[ev-charging-analytics] ${message}`)
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full))
    else if (entry.isFile() && entry.name !== CUSTOM_DATA) found.push(full)
  }
  return found
}

function readParameters() {
  const file = path.join(INPUT_DIR, CUSTOM_DATA)
  if (!fs.existsSync(file)) return {}
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) || {}
  } catch (error) {
    log(`ignoring unreadable ${CUSTOM_DATA}: ${error.message}`)
    return {}
  }
}

function round(value, digits) {
  const f = Math.pow(10, digits === undefined ? 2 : digits)
  return Math.round(value * f) / f
}

function minutesBetween(a, b) {
  return (Date.parse(b) - Date.parse(a)) / 60000
}

function median(values) {
  if (values.length === 0) return null
  const sorted = values.slice().sort((x, y) => x - y)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile(values, p) {
  if (values.length === 0) return null
  const sorted = values.slice().sort((x, y) => x - y)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

/** Load every input file that looks like a charging-session dataset. */
function loadDatasets(files) {
  const datasets = []
  for (const file of files) {
    const raw = fs.readFileSync(file)
    const info = { file: path.basename(file), bytes: raw.length, sha256: crypto.createHash('sha256').update(raw).digest('hex') }
    let parsed
    try {
      parsed = JSON.parse(raw.toString('utf8'))
    } catch (error) {
      log(`skipping ${info.file}: not JSON (${error.message})`)
      datasets.push(Object.assign(info, { usable: false, reason: 'not JSON' }))
      continue
    }
    if (!parsed || !Array.isArray(parsed.sessions)) {
      log(`skipping ${info.file}: no "sessions" array`)
      datasets.push(Object.assign(info, { usable: false, reason: 'no sessions array' }))
      continue
    }
    datasets.push(Object.assign(info, { usable: true, data: parsed }))
  }
  return datasets
}

function analyse(sessions, stations, period) {
  const periodHours = period ? minutesBetween(period.from, period.to) / 60 : null
  const byStation = {}
  const hourly = new Array(24).fill(0)
  const daily = {}
  const connectorMix = {}
  const authMix = {}
  const vehicleMix = {}
  const statusMix = {}
  const dcEfficiency = []

  for (const s of sessions) {
    const st = byStation[s.station_id] || (byStation[s.station_id] = {
      station_id: s.station_id,
      charging_type: s.charging_type,
      max_power_kw: s.max_power_kw,
      sessions: 0,
      completed: 0,
      energy_kwh: 0,
      revenue_eur: 0,
      blocking_fee_eur: 0,
      charging_minutes: 0,
      connected_minutes: 0,
      idle_minutes: 0,
      session_energy: [],
      session_minutes: []
    })
    st.sessions++
    statusMix[s.status] = (statusMix[s.status] || 0) + 1
    connectorMix[s.connector] = (connectorMix[s.connector] || 0) + 1
    authMix[s.auth_method] = (authMix[s.auth_method] || 0) + 1
    vehicleMix[s.vehicle_class] = (vehicleMix[s.vehicle_class] || 0) + 1

    const charging = minutesBetween(s.charge_start, s.charge_end)
    const connected = minutesBetween(s.plug_in, s.plug_out)
    const idle = minutesBetween(s.charge_end, s.plug_out)
    st.energy_kwh += s.energy_kwh
    st.revenue_eur += s.total_cost_eur
    st.blocking_fee_eur += s.blocking_fee_eur
    st.charging_minutes += charging
    st.connected_minutes += connected
    st.idle_minutes += idle

    if (s.status === 'completed') {
      st.completed++
      st.session_energy.push(s.energy_kwh)
      st.session_minutes.push(connected)
      if (s.charging_type === 'DC' && s.max_power_kw > 0) dcEfficiency.push(s.avg_power_kw / s.max_power_kw)
    }

    // Local time in Germany during the period is CEST (UTC+2).
    const localHour = (new Date(s.plug_in).getUTCHours() + 2) % 24
    hourly[localHour]++
    const day = s.plug_in.slice(0, 10)
    daily[day] = (daily[day] || 0) + s.energy_kwh
  }

  const stationMeta = {}
  for (const st of stations || []) stationMeta[st.station_id] = st

  const stationKpis = Object.values(byStation)
    .map((st) => {
      const meta = stationMeta[st.station_id] || {}
      return {
        station_id: st.station_id,
        city: meta.city || null,
        district: meta.district || null,
        charging_type: st.charging_type,
        max_power_kw: st.max_power_kw,
        sessions: st.sessions,
        success_rate_pct: round((st.completed / st.sessions) * 100, 1),
        energy_kwh: round(st.energy_kwh, 1),
        revenue_eur: round(st.revenue_eur, 2),
        blocking_fees_eur: round(st.blocking_fee_eur, 2),
        median_session_kwh: round(median(st.session_energy) || 0, 1),
        median_connected_min: round(median(st.session_minutes) || 0, 0),
        p90_connected_min: round(percentile(st.session_minutes, 90) || 0, 0),
        utilisation_charging_pct: periodHours ? round((st.charging_minutes / 60 / periodHours) * 100, 1) : null,
        utilisation_occupied_pct: periodHours ? round((st.connected_minutes / 60 / periodHours) * 100, 1) : null,
        idle_share_pct: st.connected_minutes ? round((st.idle_minutes / st.connected_minutes) * 100, 1) : null
      }
    })
    .sort((a, b) => b.energy_kwh - a.energy_kwh)

  const cities = {}
  for (const k of stationKpis) {
    const c = cities[k.city || 'unknown'] || (cities[k.city || 'unknown'] = { city: k.city, stations: 0, sessions: 0, energy_kwh: 0, revenue_eur: 0 })
    c.stations++
    c.sessions += k.sessions
    c.energy_kwh = round(c.energy_kwh + k.energy_kwh, 1)
    c.revenue_eur = round(c.revenue_eur + k.revenue_eur, 2)
  }

  const totalEnergy = stationKpis.reduce((a, k) => a + k.energy_kwh, 0)
  const peakHour = hourly.indexOf(Math.max.apply(null, hourly))

  return {
    totals: {
      sessions: sessions.length,
      completed_sessions: statusMix.completed || 0,
      failed_sessions: sessions.length - (statusMix.completed || 0),
      failure_rate_pct: round(((sessions.length - (statusMix.completed || 0)) / Math.max(1, sessions.length)) * 100, 2),
      energy_kwh: round(totalEnergy, 1),
      revenue_eur: round(stationKpis.reduce((a, k) => a + k.revenue_eur, 0), 2),
      blocking_fees_eur: round(stationKpis.reduce((a, k) => a + k.blocking_fees_eur, 0), 2),
      co2_avoided_kg_estimate: round(totalEnergy * 0.55, 0)
    },
    peak_plug_in_hour_local: peakHour,
    sessions_by_plug_in_hour_local: hourly,
    energy_kwh_by_day: Object.keys(daily).sort().map((d) => ({ day: d, energy_kwh: round(daily[d], 1) })),
    dc_power_efficiency: {
      sessions: dcEfficiency.length,
      median_avg_to_max_power_pct: round((median(dcEfficiency) || 0) * 100, 1),
      note: 'average delivered power relative to the charger rating; limited mainly by vehicle charge curves'
    },
    mix: { status: statusMix, connector: connectorMix, auth_method: authMix, vehicle_class: vehicleMix },
    cities: Object.values(cities).sort((a, b) => b.energy_kwh - a.energy_kwh),
    stations: stationKpis
  }
}

function main() {
  const started = Date.now()
  const params = readParameters()
  const rowLimit = Number.isInteger(params.rows) && params.rows > 0 ? params.rows : null
  log(`inputs: ${INPUT_DIR}, outputs: ${OUTPUT_DIR}, parameters: ${JSON.stringify(params)}`)

  const datasets = loadDatasets(walk(INPUT_DIR))
  const usable = datasets.filter((d) => d.usable)
  if (usable.length === 0) throw new Error('no charging-session dataset found in the inputs')

  let sessions = []
  let stations = []
  let period = null
  for (const d of usable) {
    sessions = sessions.concat(d.data.sessions)
    stations = stations.concat(d.data.stations || [])
    if (!period && d.data.period) period = d.data.period
  }
  sessions.sort((a, b) => (a.plug_in < b.plug_in ? -1 : 1))
  if (rowLimit) sessions = sessions.slice(0, rowLimit)
  log(`analysing ${sessions.length} sessions from ${usable.length} dataset(s)${rowLimit ? ` (limited to ${rowLimit} by parameter "rows")` : ''}`)

  const result = {
    algorithm: { name: 'ev-charging-analytics', version: '1.0.0' },
    generated_at: new Date().toISOString(),
    parameters: { rows: rowLimit },
    inputs: datasets.map((d) => ({ file: d.file, bytes: d.bytes, sha256: d.sha256, usable: d.usable, reason: d.reason })),
    period,
    kpis: analyse(sessions, stations, period)
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(result, null, 2))

  const t = result.kpis.totals
  const top = result.kpis.stations[0]
  const summary = [
    'EV Charging Analytics',
    `period: ${period ? `${period.from} to ${period.to}` : 'unknown'}`,
    `sessions: ${t.sessions} (failure rate ${t.failure_rate_pct}%)`,
    `energy delivered: ${t.energy_kwh} kWh, revenue ${t.revenue_eur} EUR (of which blocking fees ${t.blocking_fees_eur} EUR)`,
    `peak plug-in hour (local): ${result.kpis.peak_plug_in_hour_local}:00`,
    top ? `busiest station: ${top.station_id} (${top.city}), ${top.energy_kwh} kWh, occupied ${top.utilisation_occupied_pct}% of the time` : ''
  ].join('\n')
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.txt'), `${summary}\n`)
  log(summary.replace(/\n/g, ' | '))
  log(`done in ${Date.now() - started} ms`)
}

try {
  main()
} catch (error) {
  console.error(`[ev-charging-analytics] failed: ${error.message}`)
  process.exitCode = 1
}
