import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import VersionNr from './version_nr'

// ---- Herstedhøje, Albertslund ----
const SUMMIT = [55.690558, 12.362768]
const SLOPE_RADIUS_M = 120 // afstand fra top til skrånings-segment

const DIRS = ['N', 'NØ', 'NE', 'ØNE', 'Ø', 'SØ', 'SE', 'SSE', 'S', 'SV', 'SSV', 'VSV', 'V', 'NV', 'VNV', 'NNV']
const dirName = (deg) => DIRS[Math.round(deg / 22.5) % 16]

// Destination point (god nok approximation på denne skala)
function destPoint(lat, lon, bearingDeg, distM) {
  const R = 6371000
  const brg = (bearingDeg * Math.PI) / 180
  const d = distM / R
  const lat1 = (lat * Math.PI) / 180
  const lon1 = (lon * Math.PI) / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg))
  const lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return [(lat2 * 180) / Math.PI, ((lon2 * 180) / Math.PI + 540) % 360 - 180]
}

// 8 skråninger: aspect = retningen skråningen vender UD mod (vinden skal komme FRA den retning)
const ASPECTS = [0, 45, 90, 135, 180, 225, 270, 315]

function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function rateSlope(aspect, windFrom, speed, gusts) {
  const diff = angleDiff(aspect, windFrom)
  if (diff > 75) return { status: 'off', label: 'Bagvind/sidevind' }
  if (speed < 2.5) return { status: 'light', label: 'For svag' }
  if (gusts - speed > 6) return { status: 'gusty', label: 'Gusty' }
  if (speed > 8) return { status: 'strong', label: 'For hård' }
  if (diff <= 45) return { status: 'good', label: 'Optimal' }
  return { status: 'ok', label: 'OK (skrå vind)' }
}

const COLORS = {
  good: '#22c55e',
  ok: '#a3e635',
  light: '#facc15',
  gusty: '#fb923c',
  strong: '#f87171',
  off: '#64748b',
}

function WindArrow({ wind }) {
  const arrow = useMemo(() => {
    if (!wind) return null
    const to = (wind.direction + 180) % 360 // pilen peger den vej vinden BLÆSER hen
    const tip = destPoint(SUMMIT[0], SUMMIT[1], to, 90)
    const back = destPoint(SUMMIT[0], SUMMIT[1], to, -40)
    const left = destPoint(tip[0], tip[1], to + 150, 22)
    const right = destPoint(tip[0], tip[1], to - 150, 22)
    return { shaft: [back, tip], head: [left, tip, right] }
  }, [wind])
  if (!arrow) return null
  return (
    <>
      <Polyline positions={arrow.shaft} pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.9 }} />
      <Polyline positions={arrow.head} pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.9 }} />
    </>
  )
}

export default function App() {
  const [wind, setWind] = useState(null)
  const [hourly, setHourly] = useState([])
  const [sun, setSun] = useState(null)
  const [err, setErr] = useState(null)
  const [updated, setUpdated] = useState(null)
  const [selected, setSelected] = useState(null) // index i hourly, null = live-vind

  useEffect(() => {
    const load = async () => {
      try {
        const url =
          'https://api.open-meteo.com/v1/forecast?latitude=55.690558&longitude=12.362768' +
          '&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m' +
          '&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_80m,wind_speed_120m,precipitation_probability,temperature_2m' +
          '&daily=sunrise,sunset' +
          '&timezone=Europe%2FCopenhagen&forecast_days=2&wind_speed_unit=ms'
        const r = await fetch(url)
        const j = await r.json()
        const c = j.current
        const nowIdx = j.hourly.time.findIndex((t) => new Date(t) > new Date()) - 1
        const i = Math.max(0, nowIdx)
        setWind({
          speed: c.wind_speed_10m,
          gusts: c.wind_gusts_10m,
          direction: c.wind_direction_10m,
          temp: c.temperature_2m,
          w80: j.hourly.wind_speed_80m[i],
          w120: j.hourly.wind_speed_120m[i],
        })
        setHourly(
          j.hourly.time
            .map((t, k) => ({
              t,
              speed: j.hourly.wind_speed_10m[k],
              gusts: j.hourly.wind_gusts_10m[k],
              direction: j.hourly.wind_direction_10m[k],
              temp: j.hourly.temperature_2m[k],
              w80: j.hourly.wind_speed_80m[k],
              w120: j.hourly.wind_speed_120m[k],
              precip: j.hourly.precipitation_probability[k],
            }))
            .filter((h) => {
              const d = new Date(h.t)
              return d >= new Date() && d.getHours() >= 7 && d.getHours() <= 21
            })
            .slice(0, 14)
        )
        setUpdated(new Date().toLocaleTimeString('da-DK'))
        setSun({
          today: { rise: j.daily.sunrise[0], set: j.daily.sunset[0] },
          tomorrow: { rise: j.daily.sunrise[1], set: j.daily.sunset[1] },
        })
        setErr(null)
      } catch (e) {
        setErr('Kunne ikke hente vinddata: ' + e.message)
      }
    }
    load()
    const id = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Valgt time fra "Næste timer" styrer hele visningen — ellers live-vind
  const sel = selected !== null ? hourly[selected] : null
  const current = sel ?? wind

  const slopes = useMemo(() => {
    if (!current) return []
    return ASPECTS.map((a) => {
      const from = destPoint(SUMMIT[0], SUMMIT[1], a - 18, SLOPE_RADIUS_M)
      const to = destPoint(SUMMIT[0], SUMMIT[1], a + 18, SLOPE_RADIUS_M)
      return {
        aspect: a,
        name: dirName(a),
        line: [from, to],
        rating: rateSlope(a, current.direction, current.speed, current.gusts),
      }
    })
  }, [current])

  const best = slopes.filter((s) => s.rating.status === 'good' || s.rating.status === 'ok')

  return (
    <div className="app">
      <header>
        <h1>🪂 Herstedhøje — vind &amp; træningsskråninger</h1>
        {updated && <span className="updated">Opdateret {updated}</span>}
        <span className="updated">v<VersionNr /></span>
      </header>

      <div className="content">
        <div className="map-wrap">
          <MapContainer center={SUMMIT} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker center={SUMMIT} radius={8} pathOptions={{ color: '#111827', fillColor: '#fbbf24', fillOpacity: 1 }}>
              <Tooltip permanent direction="top">Top ~65 m</Tooltip>
            </CircleMarker>
            {slopes.map((s) => (
              <Polyline
                key={s.aspect}
                positions={s.line}
                pathOptions={{ color: COLORS[s.rating.status], weight: 10, opacity: 0.85 }}
              >
                <Tooltip permanent direction="center" className="slope-label">
                  {s.name}
                </Tooltip>
              </Polyline>
            ))}
            <WindArrow wind={current} />
          </MapContainer>
        </div>

        <aside className="panel">
          {err && <p className="error">{err}</p>}
          {wind && (
            <>
              <h2>
                {sel ? `Vind kl. ${sel.t.slice(11, 16)}` : 'Vind lige nu'}
                {sel && (
                  <button className="live-btn" onClick={() => setSelected(null)} title="Vis live-vind igen">
                    ↺ Live
                  </button>
                )}
              </h2>
              {sun && (
                <div className="sun-box">
                  🌅 Sol op <b>{sun.today.rise.slice(11, 16)}</b> · 🌇 Sol ned <b>{sun.today.set.slice(11, 16)}</b>
                  <div className="sun-sub">I morgen: {sun.tomorrow.rise.slice(11, 16)} / {sun.tomorrow.set.slice(11, 16)}</div>
                </div>
              )}
              <div className="wind-grid">
                <div><span className="big">{current.speed.toFixed(1)}</span> m/s</div>
                <div>Stød <span className="big">{current.gusts.toFixed(1)}</span> m/s</div>
                <div>Fra <span className="big">{dirName(current.direction)}</span> ({current.direction}°)</div>
                <div><span className="big">{current.temp.toFixed(0)}°</span>C</div>
                <div>80 m: <b>{current.w80?.toFixed(1)} m/s</b></div>
                <div>120 m: <b>{current.w120?.toFixed(1)} m/s</b></div>
              </div>

              <h2>Foreslåede skråninger</h2>
              {best.length === 0 && <p>Ingen gode skråninger lige nu — for svag/hård eller ustabil vind.</p>}
              <ul className="slopes">
                {best.map((s) => (
                  <li key={s.aspect}>
                    <span className="dot" style={{ background: COLORS[s.rating.status] }} />
                    <b>{s.name}-skråningen</b> — {s.rating.label}
                  </li>
                ))}
              </ul>

              <h3>Alle retninger</h3>
              <ul className="slopes small">
                {slopes.map((s) => (
                  <li key={s.aspect}>
                    <span className="dot" style={{ background: COLORS[s.rating.status] }} />
                    {s.name} — {s.rating.label}
                  </li>
                ))}
              </ul>

              <h3>Næste timer</h3>
              <table className="hours">
                <thead>
                  <tr><th>Tid</th><th>Vind</th><th>Stød</th><th>Retn.</th><th>Regn%</th></tr>
                </thead>
                <tbody>
                  {hourly.map((h, i) => (
                    <tr
                      key={h.t}
                      className={selected === i ? 'selected' : ''}
                      title="Klik for at se denne time"
                      onClick={() => setSelected(selected === i ? null : i)}
                    >
                      <td>{h.t.slice(11, 16)}</td>
                      <td>{h.speed.toFixed(1)}</td>
                      <td>{h.gusts.toFixed(1)}</td>
                      <td>{dirName(h.direction)}</td>
                      <td>{h.precip ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <div className="legend">
            <h3>Farver</h3>
            {Object.entries({ good: 'Optimal', ok: 'OK', light: 'For svag', gusty: 'Gusty', strong: 'For hård', off: 'Off' }).map(([k, v]) => (
              <div key={k}><span className="dot" style={{ background: COLORS[k] }} /> {v}</div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
