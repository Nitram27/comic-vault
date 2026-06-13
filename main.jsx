import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

const ACCENT      = '#f5f5f5'
const OWNED_COLOR = '#4ade80'
const WISH_COLOR  = '#f5f5f5'
const HEADER_BG   = '#111111'

const STATUSES = {
  owned:    { label: 'Posseduto',   color: OWNED_COLOR },
  wishlist: { label: 'Da comprare', color: WISH_COLOR  },
}

const READ_STATUS = {
  yes:     { label: 'Letto',     color: '#4ade80' },
  no:      { label: 'Non letto', color: '#555'    },
  ongoing: { label: 'In corso',  color: '#60a5fa' },
}

const MONTHS       = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

const emptyForm = { title:'', publisher:'', status:'wishlist', volume:'', release_date:'', variant:'', cost:'', notes:'', read_status:'no' }

const inputStyle = { width:'100%', background:'#1a1a1a', border:'2px solid #2a2a2a', color:'#fff', padding:'9px 12px', fontSize:14, outline:'none', boxSizing:'border-box', borderRadius:8 }
const labelStyle = { display:'block', fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:1, marginBottom:5 }

function discountedPrice(cost) {
  const p = parseFloat(cost)
  return isNaN(p) ? 0 : p * 0.95
}

function formatDate(d) {
  if (!d) return null
  const parts = d.split('-')
  if (parts.length === 3) return `${parseInt(parts[2])} ${MONTHS_SHORT[parseInt(parts[1], 10) - 1]} ${parts[0]}`
  if (parts.length === 2) return `${MONTHS_SHORT[parseInt(parts[1], 10) - 1]} ${parts[0]}`
  return d
}

function parseReleaseDate(d) {
  if (!d) return null
  const p = d.split('-')
  return new Date(parseInt(p[0]), p[1] ? parseInt(p[1]) - 1 : 0, p[2] ? parseInt(p[2]) : 1)
}

function isThisWeek(d) {
  if (!d) return false
  const date = parseReleaseDate(d)
  if (!date) return false
  const now   = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay())
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return date >= start && date <= end
}

function groupByMonthYear(list) {
  const groups = {}
  list.forEach(c => {
    let key = 'Senza data'
    if (c.release_date) {
      const p = c.release_date.split('-')
      key = p[1] ? `${MONTHS[parseInt(p[1]) - 1]} ${p[0]}` : p[0]
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  })
  return groups
}

function FixedDropdown({ trigger, children, open, setOpen }) {
  const btnRef  = useRef(null)
  const dropRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX })
    }
  }, [open])

  useEffect(() => {
    function h(e) {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, setOpen])

  return (
    <>
      <div ref={btnRef} onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        {trigger}
      </div>
      {open && (
        <div
          ref={dropRef}
          style={{ position:'absolute', top:pos.top, left:pos.left, background:'#111', border:'1px solid #333', borderRadius:8, zIndex:9999, minWidth:120, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,.8)' }}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </>
  )
}

function ReadDropdown({ comic, onChange }) {
  const [open, setOpen] = useState(false)
  const current = READ_STATUS[comic.read_status] || READ_STATUS.no
  return (
    <FixedDropdown open={open} setOpen={setOpen}
      trigger={
        <button style={{ display:'flex', alignItems:'center', gap:4, background:'#1a1a1a', border:`1px solid ${current.color}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:10, fontWeight:700, color:current.color, textTransform:'uppercase', whiteSpace:'nowrap' }}>
          {current.label} <span style={{ fontSize:8, opacity:0.6 }}>▾</span>
        </button>
      }
    >
      {Object.entries(READ_STATUS).map(([k, v]) => (
        <div key={k}
          onClick={() => { onChange(k); setOpen(false) }}
          style={{ padding:'9px 14px', cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'uppercase', color: comic.read_status === k ? '#000' : v.color, background: comic.read_status === k ? v.color : 'transparent' }}
          onMouseEnter={e => { if (comic.read_status !== k) e.currentTarget.style.background = '#222' }}
          onMouseLeave={e => { if (comic.read_status !== k) e.currentTarget.style.background = 'transparent' }}
        >
          {v.label}
        </div>
      ))}
    </FixedDropdown>
  )
}

function StatusDropdown({ comic, onChange }) {
  const [open, setOpen] = useState(false)
  const current = STATUSES[comic.status]
  return (
    <FixedDropdown open={open} setOpen={setOpen}
      trigger={
        <button style={{ display:'flex', alignItems:'center', gap:4, background:'#1a1a1a', border:`1px solid ${current.color}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:10, fontWeight:700, color:current.color, textTransform:'uppercase', whiteSpace:'nowrap' }}>
          {current.label} <span style={{ fontSize:8, opacity:0.6 }}>▾</span>
        </button>
      }
    >
      {Object.entries(STATUSES).map(([k, v]) => (
        <div key={k}
          onClick={() => { onChange(k); setOpen(false) }}
          style={{ padding:'9px 14px', cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'uppercase', color: comic.status === k ? '#000' : v.color, background: comic.status === k ? v.color : 'transparent' }}
          onMouseEnter={e => { if (comic.status !== k) e.currentTarget.style.background = '#222' }}
          onMouseLeave={e => { if (comic.status !== k) e.currentTarget.style.background = 'transparent' }}
        >
          {v.label}
        </div>
      ))}
    </FixedDropdown>
  )
}

function Autocomplete({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef(null)
  useEffect(() => { setQuery(value) }, [value])
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  return (
    <div ref={ref} style={{ position:'relative' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{ ...inputStyle, border:`2px solid ${open ? '#555' : '#2a2a2a'}` }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#111', border:'2px solid #555', borderTop:'none', zIndex:999, maxHeight:180, overflowY:'auto', borderRadius:'0 0 8px 8px' }}>
          {filtered.map(opt => (
            <div key={opt}
              onClick={() => { setQuery(opt); onChange(opt); setOpen(false) }}
              style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, color:'#ccc', borderBottom:'1px solid #1a1a1a' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2a2a2a' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusSelector({ value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>Stato</label>
      <div style={{ display:'flex', border:'2px solid #2a2a2a', borderRadius:10, overflow:'hidden' }}>
        {Object.entries(STATUSES).map(([k, v], i) => (
          <button key={k}
            onClick={() => onChange(k)}
            style={{ flex:1, padding:'9px 4px', border:'none', cursor:'pointer', fontSize:11, fontWeight:800, textTransform:'uppercase', background: value === k ? v.color : '#1a1a1a', color: value === k ? '#000' : v.color, borderRight: i === 0 ? '1px solid #2a2a2a' : 'none' }}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [comics, setComics]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [editId, setEditId]         = useState(null)
  const [selected, setSelected]     = useState(null)
  const [compact, setCompact]       = useState(false)
  const [showSpesa, setShowSpesa]   = useState(true)
  const [showBell, setShowBell]     = useState(false)
  const [seriesMode, setSeriesMode] = useState(false)
  const [seriesSearch, setSeriesSearch]     = useState('')
  const [seriesDropdown, setSeriesDropdown] = useState(false)
  const seriesRef = useRef(null)
  const bellRef   = useRef(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('comics').select('*').order('created_at', { ascending: true })
      if (!error && data) setComics(data)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const n = comics.filter(c => c.status === 'wishlist' && isThisWeek(c.release_date)).length
    if ('setAppBadge' in navigator) n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()
  }, [comics])

  useEffect(() => {
    function h(e) {
      if (seriesRef.current && !seriesRef.current.contains(e.target)) setSeriesDropdown(false)
      if (bellRef.current   && !bellRef.current.contains(e.target))   setShowBell(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const savedPublishers = [...new Set(comics.map(c => c.publisher).filter(Boolean))].sort()
  const seriesTitles    = [...new Set(comics.map(c => c.title))].sort()
  const filteredSeries  = seriesTitles.filter(t => t.toLowerCase().includes(seriesSearch.toLowerCase()))

  const now       = new Date()
  const thisMonth = now.getMonth()
  const thisYear  = now.getFullYear()

  const thisWeekComics = comics.filter(c => c.status === 'wishlist' && isThisWeek(c.release_date))

  const monthlySpent = comics
    .filter(c => {
      if (c.status !== 'owned' || !c.release_date) return false
      const p = c.release_date.split('-')
      return parseInt(p[0]) === thisYear && parseInt(p[1]) - 1 === thisMonth
    })
    .reduce((sum, c) => sum + discountedPrice(c.cost), 0)

  const stats = {
    owned:    comics.filter(c => c.status === 'owned').length,
    wishlist: comics.filter(c => c.status === 'wishlist').length,
  }

  const baseFiltered = comics
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.publisher || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.variant   || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.status === 'wishlist' && b.status === 'wishlist')
        return (a.release_date || '9999').localeCompare(b.release_date || '9999')
      if (a.status === 'wishlist') return -1
      if (b.status === 'wishlist') return 1
      return (a.release_date || '9999').localeCompare(b.release_date || '9999')
    })

  const grouped = groupByMonthYear(baseFiltered)

  function openAddForm() {
    setForm(emptyForm); setEditId(null); setSeriesMode(false); setSeriesSearch(''); setShowForm(true)
  }

  function selectExistingSeries(title) {
    const ex = comics.find(c => c.title === title)
    if (ex) setForm({ title: ex.title, publisher: ex.publisher, status: ex.status, volume: '', release_date: '', variant: '', cost: '', notes: '', read_status: 'no' })
    setSeriesSearch(title); setSeriesDropdown(false)
  }

  async function saveComic() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form }
    if (payload.status !== 'owned') payload.read_status = null
    if (editId !== null) {
      const { data, error } = await supabase.from('comics').update(payload).eq('id', editId).select().single()
      if (!error && data) setComics(prev => prev.map(c => c.id === editId ? data : c))
    } else {
      const { data, error } = await supabase.from('comics').insert({ ...payload, id: Date.now() }).select().single()
      if (!error && data) setComics(prev => [...prev, data])
    }
    setSaving(false)
    setForm(emptyForm); setSeriesSearch(''); setSeriesMode(false); setEditId(null); setShowForm(false)
  }

  async function deleteComic(id) {
    await supabase.from('comics').delete().eq('id', id)
    setComics(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  function startEdit(comic) {
    setForm({ title: comic.title, publisher: comic.publisher || '', status: comic.status, volume: comic.volume || '', release_date: comic.release_date || '', variant: comic.variant || '', cost: comic.cost || '', notes: comic.notes || '', read_status: comic.read_status || 'no' })
    setEditId(comic.id); setSeriesMode(false); setSeriesSearch(comic.title); setShowForm(true); setSelected(null)
  }

  async function changeStatus(id, newStatus) {
    const payload = { status: newStatus }
    if (newStatus !== 'owned') payload.read_status = null
    await supabase.from('comics').update(payload).eq('id', id)
    setComics(prev => prev.map(c => c.id === id ? { ...c, ...payload } : c))
  }

  async function changeReadStatus(id, rs) {
    await supabase.from('comics').update({ read_status: rs }).eq('id', id)
    setComics(prev => prev.map(c => c.id === id ? { ...c, read_status: rs } : c))
  }

  const statusColor = s => STATUSES[s]?.color || '#fff'

  if (loading) return (
    <div style={{ background:'#0a0a0a', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:48 }}>💥</div>
      <div style={{ color:ACCENT, fontWeight:800, fontSize:18, textTransform:'uppercase', letterSpacing:2 }}>Caricamento...</div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#0a0a0a', minHeight:'100vh', color:'#f5f5f5', position:'relative' }}>

      {/* HEADER */}
      <div style={{ background:HEADER_BG, borderBottom:'1px solid #222' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'14px 20px' }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:24, color:ACCENT, letterSpacing:-0.5, textTransform:'uppercase', lineHeight:1 }}>💥 Comic Vault</div>
              <div style={{ fontSize:10, color:'#444', fontWeight:600, letterSpacing:3, textTransform:'uppercase', marginTop:2 }}>La tua collezione</div>
            </div>

            <div ref={bellRef} style={{ position:'relative' }}>
              <button
                onClick={() => setShowBell(o => !o)}
                style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}
              >
                <span style={{ fontSize:18 }}>🔔</span>
                {thisWeekComics.length > 0 && (
                  <span style={{ position:'absolute', top:-3, right:-3, background:'#ef4444', color:'#fff', borderRadius:'50%', width:17, height:17, fontSize:10, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${HEADER_BG}` }}>
                    {thisWeekComics.length}
                  </span>
                )}
              </button>

              {showBell && (
                <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'#111', border:'1px solid #2a2a2a', borderRadius:12, zIndex:600, minWidth:260, maxWidth:320, boxShadow:'0 8px 30px rgba(0,0,0,.9)', overflow:'hidden' }}>
                  <div style={{ background:'#1a1a1a', borderBottom:'1px solid #2a2a2a', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:800, fontSize:11, color:ACCENT, textTransform:'uppercase', letterSpacing:1 }}>In uscita questa settimana</span>
                    <span style={{ background:'#ef4444', color:'#fff', borderRadius:20, padding:'0 6px', fontSize:10, fontWeight:900 }}>{thisWeekComics.length}</span>
                  </div>
                  {thisWeekComics.length === 0 ? (
                    <div style={{ padding:'16px 14px', color:'#444', fontSize:12, textAlign:'center' }}>Nessuna uscita questa settimana</div>
                  ) : (
                    <div style={{ maxHeight:260, overflowY:'auto' }}>
                      {thisWeekComics.map(c => (
                        <div key={c.id} style={{ padding:'10px 14px', borderBottom:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, color:'#fff', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                            <div style={{ display:'flex', gap:6, marginTop:2 }}>
                              {c.volume  && <span style={{ color:'#444', fontSize:10 }}>#{c.volume}</span>}
                              {c.variant && <span style={{ fontSize:9, background:'#1f1f1f', color:'#888', padding:'1px 5px', borderRadius:6, fontWeight:700 }}>{c.variant}</span>}
                            </div>
                          </div>
                          <span style={{ fontSize:10, color:ACCENT, fontWeight:700, flexShrink:0 }}>{formatDate(c.release_date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:10, color:'#444', textTransform:'uppercase', letterSpacing:1 }}>Spesa {MONTHS_SHORT[thisMonth]}</span>
                <button onClick={() => setShowSpesa(s => !s)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#444', padding:0, lineHeight:1 }}>
                  {showSpesa ? '👁' : '🙈'}
                </button>
              </div>
              <div style={{ fontWeight:900, fontSize:20, color:ACCENT }}>
                {showSpesa ? `€ ${monthlySpent.toFixed(2)}` : '• • •'}
              </div>
            </div>
            <button onClick={openAddForm} style={{ background:ACCENT, color:'#000', border:'none', padding:'9px 18px', fontWeight:800, fontSize:13, cursor:'pointer', textTransform:'uppercase', letterSpacing:1, borderRadius:8 }}>
              + Aggiungi
            </button>
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['all', 'Tutti', comics.length], ...Object.entries(stats).map(([k, v]) => [k, STATUSES[k].label, v])].map(([key, label, val]) => (
              <button key={key}
                onClick={() => setFilter(filter === key ? 'all' : key)}
                style={{ display:'flex', alignItems:'center', gap:5, background: filter === key ? '#2a2a2a' : 'transparent', border:`1px solid ${filter === key ? '#444' : '#2a2a2a'}`, borderRadius:20, padding:'4px 12px', cursor:'pointer' }}
              >
                <span style={{ fontWeight:900, fontSize:14, color: key === 'owned' ? OWNED_COLOR : key === 'wishlist' ? WISH_COLOR : ACCENT }}>{val}</span>
                <span style={{ fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'18px 16px' }}>

        <div style={{ display:'flex', gap:10, marginBottom:18, alignItems:'center' }}>
          <input
            placeholder="🔍 Cerca titolo, editore, variant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex:1, background:'#111', border:'1px solid #2a2a2a', color:'#fff', padding:'10px 14px', fontSize:13, outline:'none', borderRadius:8 }}
          />
          <div style={{ display:'flex', border:'1px solid #2a2a2a', borderRadius:8, overflow:'hidden' }}>
            <button onClick={() => setCompact(false)} style={{ padding:'8px 12px', background: !compact ? '#2a2a2a' : 'transparent', border:'none', cursor:'pointer', fontSize:15, color: !compact ? ACCENT : '#444' }}>▤</button>
            <button onClick={() => setCompact(true)}  style={{ padding:'8px 12px', background:  compact ? '#2a2a2a' : 'transparent', border:'none', cursor:'pointer', fontSize:15, color:  compact ? ACCENT : '#444' }}>☰</button>
          </div>
        </div>

        {baseFiltered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#333', fontSize:15, fontWeight:700, textTransform:'uppercase', letterSpacing:2, border:'1px dashed #1f1f1f', borderRadius:16 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
            Nessun fumetto trovato
          </div>
        ) : (
          Object.entries(grouped).map(([monthLabel, items]) => (
            <div key={monthLabel} style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <span style={{ fontWeight:700, fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:2 }}>{monthLabel}</span>
                <span style={{ background:'#111', border:'1px solid #1f1f1f', borderRadius:20, padding:'1px 8px', fontSize:10, color:'#444', fontWeight:700 }}>{items.length}</span>
                <div style={{ flex:1, height:'1px', background:'#1a1a1a' }} />
              </div>

              {compact ? (
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {items.map(comic => (
                    <div key={comic.id}
                      onClick={() => setSelected(comic)}
                      style={{ background:'#111', border:`1px solid ${comic.status === 'owned' ? '#1f2f1f' : '#2a2a1a'}`, borderRadius:10, padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}
                    >
                      <div style={{ width:6, height:6, borderRadius:'50%', background:statusColor(comic.status), flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:'#e5e5e5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{comic.title}</span>
                        {comic.volume  && <span style={{ fontSize:10, color:'#444', flexShrink:0 }}>#{comic.volume}</span>}
                        {comic.variant && <span style={{ fontSize:9, background:'#1a1a1a', color:'#888', padding:'1px 5px', borderRadius:6, fontWeight:700, flexShrink:0 }}>{comic.variant}</span>}
                      </div>
                      <span style={{ fontSize:10, color:'#444', flexShrink:0, fontWeight:600 }}>{formatDate(comic.release_date) || '—'}</span>
                      <div onClick={e => e.stopPropagation()} style={{ display:'flex', gap:4, flexShrink:0 }}>
                        <StatusDropdown comic={comic} onChange={s => changeStatus(comic.id, s)} />
                        {comic.status === 'owned' && <ReadDropdown comic={comic} onChange={rs => changeReadStatus(comic.id, rs)} />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
                  {items.map(comic => (
                    <div key={comic.id}
                      onClick={() => setSelected(comic)}
                      style={{ background:'#111', border:`1px solid ${comic.status === 'owned' ? '#1f2f1f' : '#2a2a1a'}`, cursor:'pointer', borderRadius:14 }}
                    >
                      <div style={{ height:3, background:statusColor(comic.status), borderRadius:'14px 14px 0 0' }} />
                      <div style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                          <div style={{ fontWeight:800, fontSize:15, color:'#f0f0f0', lineHeight:1.2, flex:1, marginRight:8 }}>{comic.title}</div>
                          {comic.release_date && <span style={{ fontSize:10, color:'#444', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>{formatDate(comic.release_date)}</span>}
                        </div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:5, alignItems:'center' }}>
                          {comic.volume  && <span style={{ fontSize:11, color:'#555', fontWeight:600 }}>N° {comic.volume}</span>}
                          {comic.variant && <span style={{ fontSize:9, background:'#1a1a1a', color:'#888', padding:'2px 7px', borderRadius:12, fontWeight:700, textTransform:'uppercase', border:'1px solid #2a2a2a' }}>{comic.variant}</span>}
                        </div>
                        {comic.publisher && <div style={{ fontSize:11, color:'#444', marginBottom:4 }}>{comic.publisher}</div>}
                        {comic.cost && (
                          <div style={{ fontSize:12, color:OWNED_COLOR, fontWeight:700, marginBottom:4 }}>
                            € {discountedPrice(comic.cost).toFixed(2)}
                            <span style={{ fontSize:10, color:'#333', marginLeft:5, textDecoration:'line-through' }}>€ {parseFloat(comic.cost).toFixed(2)}</span>
                          </div>
                        )}
                        {comic.notes && <div style={{ fontSize:11, color:'#333', marginTop:5, borderTop:'1px solid #1a1a1a', paddingTop:6, fontStyle:'italic' }}>{comic.notes}</div>}
                        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
                          <StatusDropdown comic={comic} onChange={s => changeStatus(comic.id, s)} />
                          {comic.status === 'owned' && <ReadDropdown comic={comic} onChange={rs => changeReadStatus(comic.id, rs)} />}
                        </div>
                        <div style={{ display:'flex', gap:6, marginTop:8 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => startEdit(comic)} style={{ flex:1, background:'transparent', border:'1px solid #2a2a2a', color:'#666', padding:'5px 10px', fontSize:11, cursor:'pointer', borderRadius:6 }}>✏️ Modifica</button>
                          <button onClick={() => deleteComic(comic.id)} style={{ background:'transparent', border:'1px solid #2a1a1a', color:'#555', padding:'5px 10px', fontSize:11, cursor:'pointer', borderRadius:6 }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:'#111', border:`1px solid ${statusColor(selected.status)}33`, maxWidth:420, width:'100%', borderRadius:16, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.8)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height:3, background:statusColor(selected.status) }} />
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontWeight:700, color:statusColor(selected.status), textTransform:'uppercase', fontSize:11, letterSpacing:1 }}>{STATUSES[selected.status]?.label}</span>
                {selected.status === 'owned' && selected.read_status && (
                  <span style={{ fontSize:10, color:READ_STATUS[selected.read_status]?.color, background:'#1a1a1a', padding:'2px 8px', borderRadius:10, fontWeight:700, textTransform:'uppercase' }}>
                    {READ_STATUS[selected.read_status]?.label}
                  </span>
                )}
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#444', fontSize:20, cursor:'pointer', fontWeight:300 }}>✕</button>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:'#f0f0f0', marginBottom:4 }}>{selected.title}</div>
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
                {selected.volume  && <span style={{ color:'#555', fontSize:13, fontWeight:600 }}>N° {selected.volume}</span>}
                {selected.variant && <span style={{ fontSize:10, background:'#1a1a1a', color:'#888', padding:'3px 9px', borderRadius:12, fontWeight:700, textTransform:'uppercase', border:'1px solid #2a2a2a' }}>{selected.variant}</span>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div>
                  <div style={labelStyle}>Casa editrice</div>
                  <div style={{ color:'#ccc', fontSize:13, fontWeight:600 }}>{selected.publisher || '—'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Data di uscita</div>
                  <div style={{ color:'#ccc', fontSize:13, fontWeight:600 }}>{formatDate(selected.release_date) || '—'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Prezzo (–5%)</div>
                  <div style={{ color:OWNED_COLOR, fontSize:15, fontWeight:800 }}>
                    {selected.cost ? `€ ${discountedPrice(selected.cost).toFixed(2)}` : '—'}
                    {selected.cost && <span style={{ fontSize:10, color:'#333', marginLeft:6, textDecoration:'line-through' }}>€ {parseFloat(selected.cost).toFixed(2)}</span>}
                  </div>
                </div>
              </div>
              {selected.notes && (
                <div style={{ background:'#1a1a1a', border:'1px solid #222', padding:12, color:'#555', fontSize:12, fontStyle:'italic', marginBottom:14, borderRadius:8 }}>
                  "{selected.notes}"
                </div>
              )}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => startEdit(selected)} style={{ flex:1, background:ACCENT, border:'none', color:'#000', padding:'10px', fontWeight:800, cursor:'pointer', textTransform:'uppercase', fontSize:12, borderRadius:8 }}>Modifica</button>
                <button onClick={() => deleteComic(selected.id)} style={{ background:'transparent', border:'1px solid #2a1a1a', color:'#555', padding:'10px 16px', fontWeight:700, cursor:'pointer', fontSize:12, borderRadius:8 }}>Elimina</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.95)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20, overflowY:'auto' }}
          onClick={() => { setShowForm(false); setEditId(null) }}>
          <div style={{ background:'#111', border:'1px solid #2a2a2a', maxWidth:480, width:'100%', margin:'auto', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.9)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background:'#1a1a1a', borderBottom:'1px solid #2a2a2a', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'16px 16px 0 0' }}>
              <span style={{ fontWeight:800, color:ACCENT, textTransform:'uppercase', fontSize:13, letterSpacing:1 }}>{editId ? 'Modifica fumetto' : 'Nuovo fumetto'}</span>
              <button onClick={() => { setShowForm(false); setEditId(null) }} style={{ background:'none', border:'none', color:'#555', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:24, display:'grid', gap:16 }}>

              {!editId && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', border:'1px solid #2a2a2a', borderRadius:10, overflow:'hidden' }}>
                  <button onClick={() => { setSeriesMode(false); setForm(emptyForm); setSeriesSearch('') }}
                    style={{ padding:'9px', background: !seriesMode ? '#2a2a2a' : 'transparent', color: !seriesMode ? ACCENT : '#555', border:'none', fontWeight:800, fontSize:11, cursor:'pointer', textTransform:'uppercase', letterSpacing:1 }}>
                    ✦ Nuovo titolo
                  </button>
                  <button onClick={() => setSeriesMode(true)}
                    style={{ padding:'9px', background: seriesMode ? '#2a2a2a' : 'transparent', color: seriesMode ? ACCENT : '#555', border:'none', fontWeight:800, fontSize:11, cursor:'pointer', textTransform:'uppercase', letterSpacing:1 }}>
                    ↻ Aggiorna serie
                  </button>
                </div>
              )}

              {seriesMode && !editId && (
                <div ref={seriesRef} style={{ position:'relative' }}>
                  <label style={labelStyle}>Seleziona serie esistente</label>
                  <input
                    placeholder="Cerca serie..."
                    value={seriesSearch}
                    onChange={e => { setSeriesSearch(e.target.value); setSeriesDropdown(true) }}
                    onFocus={() => setSeriesDropdown(true)}
                    style={{ ...inputStyle, borderColor:'#555' }}
                  />
                  {seriesDropdown && filteredSeries.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#111', border:'1px solid #555', borderTop:'none', zIndex:999, maxHeight:180, overflowY:'auto', borderRadius:'0 0 8px 8px' }}>
                      {filteredSeries.map(title => (
                        <div key={title}
                          onClick={() => selectExistingSeries(title)}
                          style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, color:'#ccc', borderBottom:'1px solid #1a1a1a' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#2a2a2a' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          {title}
                        </div>
                      ))}
                    </div>
                  )}
                  {seriesSearch && filteredSeries.length === 0 && <div style={{ marginTop:6, fontSize:11, color:'#444' }}>Nessuna serie trovata.</div>}
                </div>
              )}

              {(!seriesMode || editId) && (
                <div>
                  <label style={labelStyle}>Titolo *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="Es. Dylan Dog" />
                </div>
              )}

              {form.title && (
                <>
                  <Autocomplete label="Casa editrice" value={form.publisher} onChange={val => setForm(f => ({ ...f, publisher: val }))} options={savedPublishers} placeholder="Es. Bonelli" />

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div>
                      <label style={labelStyle}>Numero / Volume</label>
                      <input value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} style={inputStyle} placeholder="Es. 42" />
                    </div>
                    <div>
                      <label style={labelStyle}>Data di uscita</label>
                      <input type="date" value={form.release_date} onChange={e => setForm(f => ({ ...f, release_date: e.target.value }))} style={{ ...inputStyle, colorScheme:'dark' }} />
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div>
                      <label style={labelStyle}>Variant</label>
                      <input value={form.variant} onChange={e => setForm(f => ({ ...f, variant: e.target.value }))} style={inputStyle} placeholder="Es. Cover B..." />
                    </div>
                    <div>
                      <label style={labelStyle}>Prezzo di copertina (€)</label>
                      <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} style={inputStyle} placeholder="Es. 4.90" />
                      {form.cost && <div style={{ fontSize:11, color:OWNED_COLOR, marginTop:4 }}>–5%: € {discountedPrice(form.cost).toFixed(2)}</div>}
                    </div>
                  </div>

                  <StatusSelector value={form.status} onChange={val => setForm(f => ({ ...f, status: val }))} />

                  {form.status === 'owned' && (
                    <div>
                      <label style={labelStyle}>Letto</label>
                      <div style={{ display:'flex', border:'2px solid #2a2a2a', borderRadius:10, overflow:'hidden' }}>
                        {Object.entries(READ_STATUS).map(([k, v], i) => (
                          <button key={k}
                            onClick={() => setForm(f => ({ ...f, read_status: k }))}
                            style={{ flex:1, padding:'8px 2px', border:'none', cursor:'pointer', fontSize:10, fontWeight:800, textTransform:'uppercase', background: form.read_status === k ? v.color : '#1a1a1a', color: form.read_status === k ? '#000' : v.color, borderRight: i < 2 ? '1px solid #2a2a2a' : 'none' }}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>Note</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit' }} />
                  </div>
                </>
              )}

              {seriesMode && !form.title && !editId && (
                <div style={{ textAlign:'center', color:'#333', fontSize:12, padding:'10px 0' }}>↑ Seleziona una serie dalla lista per procedere</div>
              )}

              <button
                onClick={saveComic}
                disabled={!form.title.trim() || saving}
                style={{ background: form.title.trim() ? ACCENT : '#1a1a1a', border:'none', color: form.title.trim() ? '#000' : '#333', padding:'13px', fontWeight:900, fontSize:14, cursor: form.title.trim() ? 'pointer' : 'default', textTransform:'uppercase', letterSpacing:1, borderRadius:8 }}
              >
                {saving ? 'Salvataggio...' : editId ? 'Salva modifiche' : seriesMode ? 'Aggiungi numero' : 'Aggiungi alla collezione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
