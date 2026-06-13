import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";

const STATUSES = {
  owned:    { label: "Posseduto",   color: "#22c55e" },
  wishlist: { label: "Da comprare", color: "#facc15" },
};

const READ_STATUS = {
  yes:     { label: "Letto",     color: "#22c55e" },
  no:      { label: "Non letto", color: "#666"    },
  ongoing: { label: "In corso",  color: "#60a5fa" },
};

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

const emptyForm = { title:"", publisher:"", status:"wishlist", volume:"", release_date:"", variant:"", cost:"", notes:"", read_status:"no" };

const inputStyle = { width:"100%", background:"#1a1a1a", border:"2px solid #333", color:"#fff", padding:"9px 12px", fontSize:14, outline:"none", boxSizing:"border-box", borderRadius:8 };
const labelStyle = { display:"block", fontSize:11, color:"#666", textTransform:"uppercase", letterSpacing:1, marginBottom:5 };

function discountedPrice(cost) {
  const p = parseFloat(cost);
  return isNaN(p) ? 0 : p * 0.95;
}

function formatDate(d) {
  if (!d) return null;
  const parts = d.split("-");
  if (parts.length === 3) {
    const [y, m, day] = parts;
    return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m,10)-1]} ${y}`;
  }
  if (parts.length === 2) {
    const [y, m] = parts;
    return `${MONTHS_SHORT[parseInt(m,10)-1]} ${y}`;
  }
  return d;
}

function parseReleaseDate(d) {
  if (!d) return null;
  const parts = d.split("-");
  return new Date(parseInt(parts[0]), parts[1] ? parseInt(parts[1])-1 : 0, parts[2] ? parseInt(parts[2]) : 1);
}

function isThisWeek(d) {
  if (!d) return false;
  const date = parseReleaseDate(d);
  if (!date) return false;
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
  return date >= start && date <= end;
}

function groupByMonthYear(list) {
  const groups = {};
  list.forEach(c => {
    let key = "Senza data";
    if (c.release_date) {
      const parts = c.release_date.split("-");
      const y = parts[0];
      const m = parts[1] ? parseInt(parts[1])-1 : null;
      key = m !== null ? `${MONTHS[m]} ${y}` : y;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  return groups;
}

// Dropdown lettura — usato sia in compact che in full
function ReadDropdown({ comic, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = READ_STATUS[comic.read_status] || READ_STATUS.no;

  return (
    <div ref={ref} style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:4, background:"#1a1a1a", border:`1px solid ${current.color}`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:10, fontWeight:700, color:current.color, textTransform:"uppercase", whiteSpace:"nowrap" }}>
        <span>{current.label}</span>
        <span style={{ fontSize:8, opacity:0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"#1a1a1a", border:"1px solid #333", borderRadius:8, zIndex:500, minWidth:110, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,.6)" }}>
          {Object.entries(READ_STATUS).map(([k, v]) => (
            <div key={k} onClick={() => { onChange(k); setOpen(false); }}
              style={{ padding:"9px 12px", cursor:"pointer", fontSize:11, fontWeight:700, color: comic.read_status===k ? "#000" : v.color, background: comic.read_status===k ? v.color : "transparent", textTransform:"uppercase" }}
              onMouseEnter={e => { if (comic.read_status!==k) { e.currentTarget.style.background="#222"; } }}
              onMouseLeave={e => { if (comic.read_status!==k) { e.currentTarget.style.background="transparent"; } }}>
              {v.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Autocomplete({ label, value, onChange, options, placeholder, accentColor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef(null);
  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  return (
    <div ref={ref} style={{ position:"relative" }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} placeholder={placeholder}
        style={{ ...inputStyle, border:`2px solid ${open?(accentColor||"#facc15"):"#333"}` }} />
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#1a1a1a", border:`2px solid ${accentColor||"#facc15"}`, borderTop:"none", zIndex:999, maxHeight:180, overflowY:"auto", borderRadius:"0 0 8px 8px" }}>
          {filtered.map(opt => (
            <div key={opt} onClick={() => { setQuery(opt); onChange(opt); setOpen(false); }}
              style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, color:"#fff", borderBottom:"1px solid #222" }}
              onMouseEnter={e => { e.currentTarget.style.background=accentColor||"#facc15"; e.currentTarget.style.color="#000"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#fff"; }}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusSelector({ value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>Stato</label>
      <div style={{ display:"flex", border:"2px solid #333", borderRadius:10, overflow:"hidden" }}>
        {Object.entries(STATUSES).map(([k, v], i) => (
          <button key={k} onClick={() => onChange(k)}
            style={{ flex:1, padding:"9px 4px", border:"none", cursor:"pointer", fontSize:11, fontWeight:800, textTransform:"uppercase", background:value===k?v.color:"#1a1a1a", color:value===k?"#000":v.color, borderRight:i===0?"1px solid #333":"none" }}>
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Dropdown stato per "Da comprare" in forma di tendina
function StatusDropdown({ comic, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = STATUSES[comic.status];
  return (
    <div ref={ref} style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:4, background:"#1a1a1a", border:`1px solid ${current.color}`, borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:10, fontWeight:700, color:current.color, textTransform:"uppercase", whiteSpace:"nowrap" }}>
        <span>{current.label}</span>
        <span style={{ fontSize:8, opacity:0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"#1a1a1a", border:"1px solid #333", borderRadius:8, zIndex:500, minWidth:120, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,.6)" }}>
          {Object.entries(STATUSES).map(([k, v]) => (
            <div key={k} onClick={() => { onChange(k); setOpen(false); }}
              style={{ padding:"9px 12px", cursor:"pointer", fontSize:11, fontWeight:700, color:comic.status===k?"#000":v.color, background:comic.status===k?v.color:"transparent", textTransform:"uppercase" }}
              onMouseEnter={e => { if (comic.status!==k) e.currentTarget.style.background="#222"; }}
              onMouseLeave={e => { if (comic.status!==k) e.currentTarget.style.background="transparent"; }}>
              {v.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [comics, setComics]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [editId, setEditId]         = useState(null);
  const [selected, setSelected]     = useState(null);
  const [compact, setCompact]       = useState(false);
  const [showSpesa, setShowSpesa]   = useState(true);
  const [showBell, setShowBell]     = useState(false);
  const [seriesMode, setSeriesMode]         = useState(false);
  const [seriesSearch, setSeriesSearch]     = useState("");
  const [seriesDropdown, setSeriesDropdown] = useState(false);
  const seriesRef = useRef(null);
  const bellRef   = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from("comics").select("*").order("created_at", { ascending:true });
      if (!error && data) setComics(data);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const n = comics.filter(c => c.status==="wishlist" && isThisWeek(c.release_date)).length;
    if ("setAppBadge" in navigator) n>0 ? navigator.setAppBadge(n) : navigator.clearAppBadge();
  }, [comics]);

  useEffect(() => {
    function h(e) {
      if (seriesRef.current && !seriesRef.current.contains(e.target)) setSeriesDropdown(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const savedPublishers = [...new Set(comics.map(c=>c.publisher).filter(Boolean))].sort();
  const seriesTitles    = [...new Set(comics.map(c=>c.title))].sort();
  const filteredSeries  = seriesTitles.filter(t=>t.toLowerCase().includes(seriesSearch.toLowerCase()));

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const thisWeekComics = comics.filter(c => c.status==="wishlist" && isThisWeek(c.release_date));

  const monthlySpent = comics
    .filter(c => {
      if (c.status !== "owned") return false;
      if (!c.release_date) return false;
      const parts = c.release_date.split("-");
      return parseInt(parts[0])===thisYear && parseInt(parts[1])-1===thisMonth;
    })
    .reduce((sum,c) => sum + discountedPrice(c.cost), 0);

  const stats = {
    owned:    comics.filter(c=>c.status==="owned").length,
    wishlist: comics.filter(c=>c.status==="wishlist").length,
  };

  const baseFiltered = comics
    .filter(c => filter==="all" || c.status===filter)
    .filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.publisher||"").toLowerCase().includes(search.toLowerCase()) ||
      (c.variant||"").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b) => {
      if (a.status==="wishlist" && b.status==="wishlist")
        return (a.release_date||"9999").localeCompare(b.release_date||"9999");
      if (a.status==="wishlist") return -1;
      if (b.status==="wishlist") return 1;
      return (a.release_date||"9999").localeCompare(b.release_date||"9999");
    });

  const grouped = groupByMonthYear(baseFiltered);

  function openAddForm() {
    setForm(emptyForm); setEditId(null); setSeriesMode(false); setSeriesSearch(""); setShowForm(true);
  }

  function selectExistingSeries(title) {
    const ex = comics.find(c=>c.title===title);
    if (ex) setForm({ title:ex.title, publisher:ex.publisher, status:ex.status, volume:"", release_date:"", variant:"", cost:"", notes:"", read_status:"no" });
    setSeriesSearch(title); setSeriesDropdown(false);
  }

  async function saveComic() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form };
    if (payload.status !== "owned") payload.read_status = null;
    if (editId !== null) {
      const { data, error } = await supabase.from("comics").update(payload).eq("id", editId).select().single();
      if (!error && data) setComics(prev=>prev.map(c=>c.id===editId?data:c));
    } else {
      const { data, error } = await supabase.from("comics").insert({ ...payload, id:Date.now() }).select().single();
      if (!error && data) setComics(prev=>[...prev, data]);
    }
    setSaving(false);
    setForm(emptyForm); setSeriesSearch(""); setSeriesMode(false); setEditId(null); setShowForm(false);
  }

  async function deleteComic(id) {
    await supabase.from("comics").delete().eq("id", id);
    setComics(prev=>prev.filter(c=>c.id!==id));
    if (selected?.id===id) setSelected(null);
  }

  function startEdit(comic) {
    setForm({ title:comic.title, publisher:comic.publisher||"", status:comic.status, volume:comic.volume||"", release_date:comic.release_date||"", variant:comic.variant||"", cost:comic.cost||"", notes:comic.notes||"", read_status:comic.read_status||"no" });
    setEditId(comic.id); setSeriesMode(false); setSeriesSearch(comic.title); setShowForm(true); setSelected(null);
  }

  async function changeStatus(id, newStatus) {
    const payload = { status:newStatus };
    if (newStatus!=="owned") payload.read_status = null;
    await supabase.from("comics").update(payload).eq("id", id);
    setComics(prev=>prev.map(c=>c.id===id?{...c,...payload}:c));
  }

  async function changeReadStatus(id, rs) {
    await supabase.from("comics").update({ read_status:rs }).eq("id", id);
    setComics(prev=>prev.map(c=>c.id===id?{...c, read_status:rs}:c));
  }

  const statusColor = s => STATUSES[s]?.color||"#fff";

  if (loading) return (
    <div style={{ background:"#0a0a0a", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:48 }}>💥</div>
      <div style={{ color:"#facc15", fontWeight:800, fontSize:18, textTransform:"uppercase", letterSpacing:2 }}>Caricamento...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Segoe UI', system-ui, sans-serif", background:"#0a0a0a", minHeight:"100vh", color:"#f5f5f5" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"#facc15", borderBottom:"4px solid #000" }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"14px 20px" }}>

          {/* Riga 1: titolo + campanella */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:26, color:"#000", letterSpacing:-1, textTransform:"uppercase", lineHeight:1 }}>💥 Comic Vault</div>
              <div style={{ fontSize:11, color:"#000", fontWeight:600, letterSpacing:2, textTransform:"uppercase", opacity:0.5 }}>La tua collezione</div>
            </div>

            {/* Campanella */}
            <div ref={bellRef} style={{ position:"relative" }}>
              <button onClick={() => setShowBell(o=>!o)}
                style={{ background:"rgba(0,0,0,0.12)", border:"none", borderRadius:"50%", width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative", flexShrink:0 }}>
                <span style={{ fontSize:20 }}>🔔</span>
                {thisWeekComics.length > 0 && (
                  <span style={{ position:"absolute", top:-2, right:-2, background:"#ef4444", color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #facc15" }}>
                    {thisWeekComics.length}
                  </span>
                )}
              </button>

              {/* Popup campanella */}
              {showBell && (
                <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"#111", border:"2px solid #facc15", borderRadius:12, zIndex:600, minWidth:260, maxWidth:320, boxShadow:"0 8px 30px rgba(0,0,0,.8)", overflow:"hidden" }}>
                  <div style={{ background:"#facc15", padding:"8px 14px", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontWeight:900, fontSize:12, color:"#000", textTransform:"uppercase", letterSpacing:1 }}>In uscita questa settimana</span>
                    <span style={{ background:"#000", color:"#facc15", borderRadius:20, padding:"0 6px", fontSize:11, fontWeight:900 }}>{thisWeekComics.length}</span>
                  </div>
                  {thisWeekComics.length === 0 ? (
                    <div style={{ padding:"16px 14px", color:"#555", fontSize:12, textAlign:"center" }}>Nessuna uscita questa settimana</div>
                  ) : (
                    <div style={{ maxHeight:260, overflowY:"auto" }}>
                      {thisWeekComics.map(c => (
                        <div key={c.id} style={{ padding:"10px 14px", borderBottom:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, color:"#fff", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                            <div style={{ display:"flex", gap:6, marginTop:2, alignItems:"center" }}>
                              {c.volume && <span style={{ color:"#666", fontSize:10 }}>#{c.volume}</span>}
                              {c.variant && <span style={{ fontSize:9, background:"#2a1a00", color:"#facc15", padding:"1px 5px", borderRadius:6, fontWeight:700 }}>{c.variant}</span>}
                            </div>
                          </div>
                          <span style={{ fontSize:10, color:"#facc15", fontWeight:700, flexShrink:0 }}>{formatDate(c.release_date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Riga 2: spesa + aggiungi */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:11, color:"#000", opacity:0.55, textTransform:"uppercase", letterSpacing:1 }}>Spesa {MONTHS_SHORT[thisMonth]}</span>
                <button onClick={() => setShowSpesa(s=>!s)}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#000", opacity:0.45, padding:0, lineHeight:1 }}>
                  {showSpesa?"👁":"🙈"}
                </button>
              </div>
              <div style={{ fontWeight:900, fontSize:20, color:"#000" }}>
                {showSpesa ? `€ ${monthlySpent.toFixed(2)}` : "• • •"}
              </div>
            </div>
            <button onClick={openAddForm}
              style={{ background:"#000", color:"#facc15", border:"none", padding:"9px 18px", fontWeight:800, fontSize:14, cursor:"pointer", textTransform:"uppercase", letterSpacing:1, borderRadius:8 }}>
              + Aggiungi
            </button>
          </div>

          {/* Pills stats */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[["all","Tutti",comics.length], ...Object.entries(stats).map(([k,v])=>[k,STATUSES[k].label,v])].map(([key,label,val]) => (
              <button key={key} onClick={() => setFilter(filter===key?"all":key)}
                style={{ display:"flex", alignItems:"center", gap:5, background:filter===key?"#000":"rgba(0,0,0,0.13)", border:`2px solid ${filter===key?"#000":"rgba(0,0,0,0.25)"}`, borderRadius:20, padding:"4px 12px", cursor:"pointer" }}>
                <span style={{ fontWeight:900, fontSize:15, color:filter===key?"#facc15":"#000" }}>{val}</span>
                <span style={{ fontSize:11, fontWeight:700, color:filter===key?"#facc15":"#000", textTransform:"uppercase", letterSpacing:0.5 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"18px 16px" }}>

        {/* Toolbar */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <input placeholder="🔍 Cerca titolo, editore, variant..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, minWidth:160, background:"#1a1a1a", border:"2px solid #333", color:"#fff", padding:"10px 14px", fontSize:14, outline:"none", borderRadius:8 }} />
          <div style={{ display:"flex", border:"2px solid #333", borderRadius:8, overflow:"hidden" }}>
            <button onClick={() => setCompact(false)} title="Vista intera"
              style={{ padding:"8px 12px", background:!compact?"#facc15":"#1a1a1a", border:"none", cursor:"pointer", fontSize:15, color:!compact?"#000":"#666" }}>▤</button>
            <button onClick={() => setCompact(true)} title="Vista compressa"
              style={{ padding:"8px 12px", background:compact?"#facc15":"#1a1a1a", border:"none", cursor:"pointer", fontSize:15, color:compact?"#000":"#666" }}>☰</button>
          </div>
        </div>

        {/* Lista raggruppata */}
        {baseFiltered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"#444", fontSize:16, fontWeight:700, textTransform:"uppercase", letterSpacing:2, border:"3px dashed #222", borderRadius:16 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
            Nessun fumetto trovato
          </div>
        ) : (
          Object.entries(grouped).map(([monthLabel, items]) => (
            <div key={monthLabel} style={{ marginBottom:28 }}>
              {/* Intestazione mese */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <span style={{ fontWeight:900, fontSize:12, color:"#facc15", textTransform:"uppercase", letterSpacing:2 }}>{monthLabel}</span>
                <span style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:20, padding:"1px 8px", fontSize:11, color:"#555", fontWeight:700 }}>{items.length}</span>
                <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
              </div>

              {compact ? (
                /* ── VISTA COMPRESSA ── */
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {items.map(comic => (
                    <div key={comic.id} onClick={() => setSelected(comic)}
                      style={{ background:"#111", border:`2px solid ${statusColor(comic.status)}`, borderRadius:10, padding:"8px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:statusColor(comic.status), flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, fontSize:13, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{comic.title}</span>
                        {comic.volume && <span style={{ fontSize:11, color:"#555", flexShrink:0 }}>#{comic.volume}</span>}
                        {comic.variant && <span style={{ fontSize:9, background:"#2a1a00", color:"#facc15", padding:"1px 5px", borderRadius:8, fontWeight:700, flexShrink:0 }}>{comic.variant}</span>}
                      </div>
                      <span style={{ fontSize:11, color:"#444", flexShrink:0, fontWeight:600 }}>{formatDate(comic.release_date)||"—"}</span>
                      {/* Status dropdown */}
                      <StatusDropdown comic={comic} onChange={s => changeStatus(comic.id, s)} />
                      {/* Read dropdown — solo posseduto */}
                      {comic.status === "owned" && (
                        <ReadDropdown comic={comic} onChange={rs => changeReadStatus(comic.id, rs)} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* ── VISTA INTERA ── */
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:12 }}>
                  {items.map(comic => (
                    <div key={comic.id} onClick={() => setSelected(comic)}
                      style={{ background:"#111", border:`3px solid ${statusColor(comic.status)}`, cursor:"pointer", overflow:"hidden", borderRadius:14 }}>
                      <div style={{ background:statusColor(comic.status), padding:"4px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:10, fontWeight:800, color:"#000", textTransform:"uppercase", letterSpacing:1 }}>{STATUSES[comic.status]?.label}</span>
                        {comic.release_date && <span style={{ fontSize:10, color:"#000", fontWeight:600 }}>{formatDate(comic.release_date)}</span>}
                      </div>
                      <div style={{ padding:"12px 14px" }}>
                        <div style={{ fontWeight:800, fontSize:15, color:"#fff", marginBottom:3, lineHeight:1.2 }}>{comic.title}</div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:5, alignItems:"center" }}>
                          {comic.volume && <span style={{ fontSize:11, color:"#888", fontWeight:600 }}>N° {comic.volume}</span>}
                          {comic.variant && <span style={{ fontSize:10, background:"#2a1a00", color:"#facc15", padding:"2px 7px", borderRadius:20, fontWeight:700, textTransform:"uppercase" }}>{comic.variant}</span>}
                        </div>
                        <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>{comic.publisher}</div>
                        {comic.cost && (
                          <div style={{ fontSize:12, color:"#22c55e", fontWeight:700, marginBottom:2 }}>
                            € {discountedPrice(comic.cost).toFixed(2)}
                            <span style={{ fontSize:10, color:"#444", marginLeft:5, textDecoration:"line-through" }}>€ {parseFloat(comic.cost).toFixed(2)}</span>
                          </div>
                        )}
                        {comic.notes && <div style={{ fontSize:11, color:"#555", marginTop:6, borderTop:"1px solid #1a1a1a", paddingTop:6, fontStyle:"italic" }}>{comic.notes}</div>}

                        {/* Dropdowns stato + lettura */}
                        <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
                          <StatusDropdown comic={comic} onChange={s => changeStatus(comic.id, s)} />
                          {comic.status === "owned" && (
                            <ReadDropdown comic={comic} onChange={rs => changeReadStatus(comic.id, rs)} />
                          )}
                        </div>

                        <div style={{ display:"flex", gap:6, marginTop:8 }} onClick={e=>e.stopPropagation()}>
                          <button onClick={() => startEdit(comic)} style={{ flex:1, background:"#1a1a1a", border:"1px solid #333", color:"#aaa", padding:"5px 10px", fontSize:11, cursor:"pointer", borderRadius:6 }}>✏️ Modifica</button>
                          <button onClick={() => deleteComic(comic.id)} style={{ background:"#1a1a1a", border:"1px solid #7f1d1d", color:"#ef4444", padding:"5px 10px", fontSize:11, cursor:"pointer", borderRadius:6 }}>🗑</button>
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

      {/* ── DETAIL MODAL ── */}
      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:"#111", border:`4px solid ${statusColor(selected.status)}`, maxWidth:420, width:"100%", overflow:"hidden", borderRadius:16 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:statusColor(selected.status), padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontWeight:800, color:"#000", textTransform:"uppercase", fontSize:12 }}>{STATUSES[selected.status]?.label}</span>
                {selected.status==="owned" && selected.read_status && (
                  <span style={{ fontSize:10, background:"rgba(0,0,0,0.2)", color:"#000", padding:"2px 7px", borderRadius:10, fontWeight:700 }}>
                    {READ_STATUS[selected.read_status]?.label}
                  </span>
                )}
              </div>
              <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", color:"#000", fontSize:18, cursor:"pointer", fontWeight:900 }}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ fontWeight:900, fontSize:22, color:"#fff", marginBottom:4 }}>{selected.title}</div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
                {selected.volume && <span style={{ color:"#888", fontSize:13, fontWeight:600 }}>N° {selected.volume}</span>}
                {selected.variant && <span style={{ fontSize:11, background:"#2a1a00", color:"#facc15", padding:"3px 9px", borderRadius:20, fontWeight:700, textTransform:"uppercase" }}>{selected.variant}</span>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <div style={labelStyle}>Casa editrice</div>
                  <div style={{ color:"#ddd", fontSize:14, fontWeight:600 }}>{selected.publisher||"—"}</div>
                </div>
                <div>
                  <div style={labelStyle}>Data di uscita</div>
                  <div style={{ color:"#ddd", fontSize:14, fontWeight:600 }}>{formatDate(selected.release_date)||"—"}</div>
                </div>
                <div>
                  <div style={labelStyle}>Prezzo (–5%)</div>
                  <div style={{ color:"#22c55e", fontSize:16, fontWeight:800 }}>
                    {selected.cost ? `€ ${discountedPrice(selected.cost).toFixed(2)}` : "—"}
                    {selected.cost && <span style={{ fontSize:11, color:"#555", marginLeft:6, textDecoration:"line-through" }}>€ {parseFloat(selected.cost).toFixed(2)}</span>}
                  </div>
                </div>
              </div>
              {selected.notes && (
                <div style={{ background:"#1a1a1a", border:"1px solid #222", padding:12, color:"#999", fontSize:13, fontStyle:"italic", marginBottom:12, borderRadius:8 }}>
                  "{selected.notes}"
                </div>
              )}
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={() => startEdit(selected)} style={{ flex:1, background:"#facc15", border:"none", color:"#000", padding:"10px", fontWeight:800, cursor:"pointer", textTransform:"uppercase", fontSize:13, borderRadius:8 }}>Modifica</button>
                <button onClick={() => deleteComic(selected.id)} style={{ background:"#7f1d1d", border:"none", color:"#fff", padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:13, borderRadius:8 }}>Elimina</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20, overflowY:"auto" }}
          onClick={() => { setShowForm(false); setEditId(null); }}>
          <div style={{ background:"#111", border:"4px solid #facc15", maxWidth:480, width:"100%", margin:"auto", borderRadius:16 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:"#facc15", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:900, color:"#000", textTransform:"uppercase", fontSize:14 }}>{editId?"Modifica fumetto":"Nuovo fumetto"}</span>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background:"none", border:"none", color:"#000", fontSize:20, cursor:"pointer", fontWeight:900 }}>✕</button>
            </div>
            <div style={{ padding:24, display:"grid", gap:16 }}>

              {!editId && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", border:"2px solid #facc15", borderRadius:10, overflow:"hidden" }}>
                  <button onClick={() => { setSeriesMode(false); setForm(emptyForm); setSeriesSearch(""); }}
                    style={{ padding:"9px", background:!seriesMode?"#facc15":"transparent", color:!seriesMode?"#000":"#facc15", border:"none", fontWeight:800, fontSize:12, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>
                    ✦ Nuovo titolo
                  </button>
                  <button onClick={() => setSeriesMode(true)}
                    style={{ padding:"9px", background:seriesMode?"#facc15":"transparent", color:seriesMode?"#000":"#facc15", border:"none", fontWeight:800, fontSize:12, cursor:"pointer", textTransform:"uppercase", letterSpacing:1 }}>
                    ↻ Aggiorna serie
                  </button>
                </div>
              )}

              {seriesMode && !editId && (
                <div ref={seriesRef} style={{ position:"relative" }}>
                  <label style={labelStyle}>Seleziona serie esistente</label>
                  <input placeholder="Cerca serie..." value={seriesSearch}
                    onChange={e => { setSeriesSearch(e.target.value); setSeriesDropdown(true); }}
                    onFocus={() => setSeriesDropdown(true)}
                    style={{ ...inputStyle, borderColor:"#facc15" }} />
                  {seriesDropdown && filteredSeries.length > 0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#1a1a1a", border:"2px solid #facc15", borderTop:"none", zIndex:999, maxHeight:180, overflowY:"auto", borderRadius:"0 0 8px 8px" }}>
                      {filteredSeries.map(title => (
                        <div key={title} onClick={() => selectExistingSeries(title)}
                          style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, color:"#fff", borderBottom:"1px solid #222" }}
                          onMouseEnter={e => { e.currentTarget.style.background="#facc15"; e.currentTarget.style.color="#000"; }}
                          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#fff"; }}>
                          {title}
                        </div>
                      ))}
                    </div>
                  )}
                  {seriesSearch && filteredSeries.length===0 && <div style={{ marginTop:6, fontSize:11, color:"#666" }}>Nessuna serie trovata.</div>}
                </div>
              )}

              {(!seriesMode || editId) && (
                <div>
                  <label style={labelStyle}>Titolo *</label>
                  <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={inputStyle} placeholder="Es. Dylan Dog" />
                </div>
              )}

              {form.title && (
                <>
                  <Autocomplete label="Casa editrice" value={form.publisher} onChange={val=>setForm(f=>({...f,publisher:val}))} options={savedPublishers} placeholder="Es. Bonelli" accentColor="#facc15" />

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <div>
                      <label style={labelStyle}>Numero / Volume</label>
                      <input value={form.volume} onChange={e=>setForm(f=>({...f,volume:e.target.value}))} style={inputStyle} placeholder="Es. 42" />
                    </div>
                    <div>
                      <label style={labelStyle}>Data di uscita</label>
                      <input type="date" value={form.release_date} onChange={e=>setForm(f=>({...f,release_date:e.target.value}))} style={{ ...inputStyle, colorScheme:"dark" }} />
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <div>
                      <label style={labelStyle}>Variant</label>
                      <input value={form.variant} onChange={e=>setForm(f=>({...f,variant:e.target.value}))} style={inputStyle} placeholder="Es. Cover B..." />
                    </div>
                    <div>
                      <label style={labelStyle}>Prezzo di copertina (€)</label>
                      <input type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} style={inputStyle} placeholder="Es. 4.90" />
                      {form.cost && <div style={{ fontSize:11, color:"#22c55e", marginTop:4 }}>Con sconto 5%: € {discountedPrice(form.cost).toFixed(2)}</div>}
                    </div>
                  </div>

                  <StatusSelector value={form.status} onChange={val=>setForm(f=>({...f,status:val}))} />

                  {form.status==="owned" && (
                    <div>
                      <label style={labelStyle}>Letto</label>
                      <div style={{ display:"flex", border:"2px solid #333", borderRadius:10, overflow:"hidden" }}>
                        {Object.entries(READ_STATUS).map(([k,v],i)=>(
                          <button key={k} onClick={()=>setForm(f=>({...f,read_status:k}))}
                            style={{ flex:1, padding:"8px 2px", border:"none", cursor:"pointer", fontSize:10, fontWeight:800, textTransform:"uppercase", background:form.read_status===k?v.color:"#1a1a1a", color:form.read_status===k?"#000":v.color, borderRight:i<2?"1px solid #333":"none" }}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>Note</label>
                    <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ ...inputStyle, resize:"vertical", fontFamily:"inherit" }} />
                  </div>
                </>
              )}

              {seriesMode && !form.title && !editId && (
                <div style={{ textAlign:"center", color:"#555", fontSize:13, padding:"10px 0" }}>↑ Seleziona una serie dalla lista per procedere</div>
              )}

              <button onClick={saveComic} disabled={!form.title.trim()||saving}
                style={{ background:form.title.trim()?"#facc15":"#222", border:"none", color:form.title.trim()?"#000":"#555", padding:"13px", fontWeight:900, fontSize:15, cursor:form.title.trim()?"pointer":"default", textTransform:"uppercase", letterSpacing:1, borderRadius:8 }}>
                {saving?"Salvataggio...":editId?"Salva modifiche":seriesMode?"Aggiungi numero":"Aggiungi alla collezione"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
