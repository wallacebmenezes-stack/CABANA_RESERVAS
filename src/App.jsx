import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://wbzpfcuoytgadcnstcue.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndienBmY3VveXRnYWRjbnN0Y3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTI4ODUsImV4cCI6MjA5NTQyODg4NX0.vL7NP0-781gusMMNeqNTTUdQNTxAKr4Gtoo4Y8hQOtY";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const DIAS_CURTO = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const C = {
  bg:      "#0f0f0f",
  card:    "#1a1a1a",
  border:  "#2a2a2a",
  text:    "#e8e6df",
  muted:   "#888780",
  accent:  "#f5a623",
  blue:    "#378ADD",
  green:   "#639922",
  red:     "#E24B4A",
  amber:   "#BA7517",
  purple:  "#534AB7",
  teal:    "#0F6E56",
};

const S = {
  inp: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "7px 10px", fontSize: 13, width: "100%", outline: "none" },
  btn: (bg = C.accent, color = "#000") => ({ background: bg, color, border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }),
  btnGhost: { background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: "7px 14px", fontSize: 13, cursor: "pointer" },
};

function toDS(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function formatFull(d) { return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
function formatShort(d) { return `${DIAS_CURTO[d.getDay()]}, ${d.getDate()} ${MESES_CURTO[d.getMonth()]}`; }
function isToday(d) { const t = new Date(); return d.toDateString() === t.toDateString(); }
function getTurno(h) { return parseInt(h) < 17 ? "almoco" : "jantar"; }
function getTurnoLabel(h) { return parseInt(h) < 17 ? "Almoço" : "Jantar"; }

const ESPACO_CLS = { "VIP I": { bg: "#EEEDFE", color: "#3C3489" }, "VIP II": { bg: "#EEEDFE", color: "#534AB7" }, "Vista Mar": { bg: "#E1F5EE", color: "#0F6E56" }, "Geral": { bg: "#2a2a2a", color: "#aaa" }, "Mezanino": { bg: "#FAEEDA", color: "#633806" } };
const STATUS_CLS = { confirmada: { bg: "#EAF3DE", color: "#3B6D11" }, pendente: { bg: "#FAEEDA", color: "#854F0B" }, cancelada: { bg: "#2a2a2a", color: "#888" } };

function EspacoBadge({ nome }) {
  if (!nome) return <span style={{ fontSize: 11, color: C.muted }}>—</span>;
  const s = ESPACO_CLS[nome] || { bg: "#2a2a2a", color: "#aaa" };
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{nome}</span>;
}

function StatusPill({ status }) {
  const s = STATUS_CLS[status] || {};
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: s.bg, color: s.color }}>{status}</span>;
}

function CapBar({ total, cap }) {
  const pct = Math.min(100, Math.round((total / cap) * 100));
  const cor = pct >= 90 ? C.red : pct >= 70 ? C.amber : C.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 280 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 99, background: C.border, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: cor, borderRadius: 99, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 11, color: pct >= 90 ? C.red : C.muted, whiteSpace: "nowrap" }}>{total} de {cap} confirmados</span>
    </div>
  );
}

const RES_VAZIO = { cliente_nome: "", cliente_contato: "", data: "", horario: "12:00", qtd_pessoas: "", espaco_id: "", status: "pendente", observacoes: "" };

export default function App() {
  const [usuario, setUsuario]     = useState(null);
  const [authLoad, setAuthLoad]   = useState(true);
  const [email, setEmail]         = useState("");
  const [senha, setSenha]         = useState("");
  const [erroAuth, setErroAuth]   = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);

  const [unidades, setUnidades]   = useState([]);
  const [espacos, setEspacos]     = useState([]);
  const [reservas, setReservas]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const [unidadeAtiva, setUnidadeAtiva] = useState(null);
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [view, setView]                 = useState("dia"); // "dia" | "agenda"
  const [busca, setBusca]               = useState("");
  const [searchRes, setSearchRes]       = useState([]);
  const [showSearch, setShowSearch]     = useState(false);
  const searchRef = useRef(null);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editRes, setEditRes]       = useState(null);
  const [form, setForm]             = useState(RES_VAZIO);
  const [salvando, setSalvando]     = useState(false);
  const [erroForm, setErroForm]     = useState("");

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setUsuario(data.session?.user || null); setAuthLoad(false); });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => setUsuario(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!usuario) return;
    async function load() {
      setLoading(true);
      const [{ data: u }, { data: e }, { data: r }] = await Promise.all([
        sb.from("unidades").select("*").eq("ativo", true).order("nome"),
        sb.from("espacos").select("*").eq("ativo", true).order("nome"),
        sb.from("reservas").select("*, clientes(nome, contato)").order("data").order("horario"),
      ]);
      setUnidades(u || []);
      setEspacos(e || []);
      const mapped = (r || []).map(x => ({
        ...x,
        cliente_nome: x.clientes?.nome || "",
        cliente_contato: x.clientes?.contato || "",
      }));
      setReservas(mapped);
      if (u && u.length > 0) setUnidadeAtiva(u[0].id);
      setLoading(false);
    }
    load();
  }, [usuario]);

  useEffect(() => {
    function handleClick(e) { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function login(e) {
    e.preventDefault();
    setLoadingAuth(true); setErroAuth("");
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    setLoadingAuth(false);
    if (error) setErroAuth("E-mail ou senha incorretos.");
  }

  async function logout() { await sb.auth.signOut(); }

  const espacosDaUnidade = useMemo(() => espacos.filter(e => e.unidade_id === unidadeAtiva), [espacos, unidadeAtiva]);
  const CAP_TOTAL = useMemo(() => espacosDaUnidade.reduce((a, e) => a + e.capacidade, 0) || 200, [espacosDaUnidade]);

  const reservasDoDia = useCallback((ds) => reservas.filter(r => r.unidade_id === unidadeAtiva && r.data === ds), [reservas, unidadeAtiva]);

  function onBusca(q) {
    setBusca(q);
    if (q.trim().length < 2) { setSearchRes([]); setShowSearch(false); return; }
    const term = q.toLowerCase();
    const found = reservas.filter(r => r.unidade_id === unidadeAtiva && r.cliente_nome.toLowerCase().includes(term));
    setSearchRes(found.slice(0, 8));
    setShowSearch(true);
  }

  function goToReserva(r) {
    setBusca(""); setSearchRes([]); setShowSearch(false);
    setCurrentDate(new Date(r.data + "T12:00:00"));
    setView("dia");
    setTimeout(() => openEdit(r), 100);
  }

  function openNova() {
    setEditRes(null);
    setForm({ ...RES_VAZIO, data: toDS(currentDate), espaco_id: espacosDaUnidade[0]?.id || "" });
    setErroForm(""); setModalOpen(true);
  }

  function openEdit(r) {
    setEditRes(r);
    setForm({ cliente_nome: r.cliente_nome, cliente_contato: r.cliente_contato, data: r.data, horario: r.horario, qtd_pessoas: r.qtd_pessoas, espaco_id: r.espaco_id || "", status: r.status, observacoes: r.observacoes || "" });
    setErroForm(""); setModalOpen(true);
  }

  async function salvar() {
    if (!form.cliente_nome.trim()) { setErroForm("Informe o nome do cliente."); return; }
    if (!form.data) { setErroForm("Informe a data."); return; }
    if (!form.qtd_pessoas) { setErroForm("Informe a quantidade de pessoas."); return; }
    setSalvando(true); setErroForm("");
    try {
      let cliente_id = editRes?.cliente_id;
      if (!editRes) {
        const { data: c, error: ce } = await sb.from("clientes").insert({ nome: form.cliente_nome.trim(), contato: form.cliente_contato.trim() }).select().single();
        if (ce) throw ce;
        cliente_id = c.id;
      } else {
        await sb.from("clientes").update({ nome: form.cliente_nome.trim(), contato: form.cliente_contato.trim() }).eq("id", cliente_id);
      }
      const payload = { unidade_id: unidadeAtiva, cliente_id, data: form.data, horario: form.horario, qtd_pessoas: parseInt(form.qtd_pessoas), espaco_id: form.espaco_id || null, status: form.status, observacoes: form.observacoes.trim() };
      if (editRes) {
        const { error } = await sb.from("reservas").update(payload).eq("id", editRes.id);
        if (error) throw error;
        setReservas(prev => prev.map(r => r.id === editRes.id ? { ...r, ...payload, cliente_nome: form.cliente_nome, cliente_contato: form.cliente_contato } : r));
      } else {
        const { data: nr, error } = await sb.from("reservas").insert(payload).select().single();
        if (error) throw error;
        setReservas(prev => [...prev, { ...nr, cliente_nome: form.cliente_nome, cliente_contato: form.cliente_contato }]);
      }
      setModalOpen(false);
    } catch (err) { setErroForm(err.message || "Erro ao salvar."); }
    setSalvando(false);
  }

  async function excluir() {
    if (!editRes) return;
    if (!window.confirm("Excluir esta reserva?")) return;
    await sb.from("reservas").delete().eq("id", editRes.id);
    setReservas(prev => prev.filter(r => r.id !== editRes.id));
    setModalOpen(false);
  }

  function f(k, v) { setForm(p => ({ ...p, [k]: v })); }

  if (authLoad) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: C.muted, fontSize: 14 }}>Carregando...</div>;

  if (!usuario) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.bg }}>
      <form onSubmit={login} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 340 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.accent, marginBottom: 4 }}>Cabana do Sol</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>Sistema de Reservas</div>
        {erroAuth && <div style={{ fontSize: 12, color: C.red, marginBottom: 12, padding: "8px 10px", background: C.red + "18", borderRadius: 8 }}>{erroAuth}</div>}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>E-MAIL</label>
          <input style={S.inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>SENHA</label>
          <input style={S.inp} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" />
        </div>
        <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={loadingAuth}>{loadingAuth ? "Entrando..." : "Entrar"}</button>
      </form>
    </div>
  );

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: C.muted, fontSize: 14 }}>Carregando dados...</div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* TOPBAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Cabana do Sol <span style={{ color: C.muted, fontWeight: 400 }}>/ Reservas</span></div>

        {/* Unidades */}
        <div style={{ display: "flex", gap: 4 }}>
          {unidades.map(u => (
            <button key={u.id} onClick={() => setUnidadeAtiva(u.id)} style={{ ...S.btnGhost, background: unidadeAtiva === u.id ? C.text : "none", color: unidadeAtiva === u.id ? C.bg : C.muted, borderColor: unidadeAtiva === u.id ? C.text : C.border }}>
              {u.nome}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Busca */}
          <div ref={searchRef} style={{ position: "relative" }}>
            <input style={{ ...S.inp, width: 200, paddingLeft: 32 }} placeholder="Buscar cliente..." value={busca} onChange={e => onBusca(e.target.value)} onFocus={() => busca.length >= 2 && setShowSearch(true)} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>🔍</span>
            {showSearch && searchRes.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, zIndex: 200, maxHeight: 360, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
                {searchRes.map(r => (
                  <div key={r.id} onClick={() => goToReserva(r)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.cliente_nome}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>📞 {r.cliente_contato || "—"}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: C.border, color: C.muted }}>📅 {r.data.split("-").reverse().join("/")}</span>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: C.border, color: C.muted }}>🕐 {r.horario} · {getTurnoLabel(r.horario)}</span>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: C.border, color: C.muted }}>👥 {r.qtd_pessoas} pessoas</span>
                      <StatusPill status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showSearch && searchRes.length === 0 && busca.length >= 2 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, zIndex: 200, padding: 16, fontSize: 13, color: C.muted, textAlign: "center" }}>
                Nenhum cliente encontrado
              </div>
            )}
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 4 }}>
            {[["dia", "☰"], ["agenda", "📅"]].map(([v, icon]) => (
              <button key={v} onClick={() => setView(v)} title={v === "dia" ? "Visão do dia" : "Próximos dias"} style={{ ...S.btnGhost, background: view === v ? C.border : "none", color: view === v ? C.text : C.muted, width: 34, padding: 0 }}>
                {icon}
              </button>
            ))}
          </div>

          <button onClick={openNova} style={S.btn()}>+ Nova reserva</button>
          <button onClick={logout} style={{ ...S.btnGhost, fontSize: 12 }}>Sair</button>
        </div>
      </div>

      {/* NAV DATE */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setCurrentDate(d => addDays(d, view === "dia" ? -1 : -7))} style={{ ...S.btnGhost, width: 30, padding: 0 }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, minWidth: 200, textAlign: "center" }}>
          {view === "dia" ? formatFull(currentDate) : `A partir de ${formatShort(currentDate)}`}
        </span>
        <button onClick={() => setCurrentDate(d => addDays(d, view === "dia" ? 1 : 7))} style={{ ...S.btnGhost, width: 30, padding: 0 }}>›</button>
        <button onClick={() => setCurrentDate(new Date())} style={{ ...S.btnGhost, fontSize: 11, padding: "4px 10px" }}>Hoje</button>
      </div>

      {/* CONTENT */}
      <div style={{ padding: view === "agenda" ? 0 : 20 }}>
        {view === "dia" ? <ViewDia ds={toDS(currentDate)} reservasDoDia={reservasDoDia} CAP_TOTAL={CAP_TOTAL} onEdit={openEdit} /> : <ViewAgenda currentDate={currentDate} reservasDoDia={reservasDoDia} CAP_TOTAL={CAP_TOTAL} onEdit={openEdit} />}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: "92%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{editRes ? "Editar reserva" : "Nova reserva"}</div>
            {erroForm && <div style={{ fontSize: 12, color: C.red, marginBottom: 12, padding: "8px 10px", background: C.red + "18", borderRadius: 8 }}>{erroForm}</div>}
            <Row>
              <Grp label="Nome do cliente"><input style={S.inp} value={form.cliente_nome} onChange={e => f("cliente_nome", e.target.value)} placeholder="Ex: Airton Comercial" /></Grp>
            </Row>
            <Row>
              <Grp label="Contato"><input style={S.inp} value={form.cliente_contato} onChange={e => f("cliente_contato", e.target.value)} placeholder="98 99999-0000" /></Grp>
              <Grp label="Nº de pessoas"><input style={S.inp} type="number" min="1" value={form.qtd_pessoas} onChange={e => f("qtd_pessoas", e.target.value)} /></Grp>
            </Row>
            <Row>
              <Grp label="Data"><input style={S.inp} type="date" value={form.data} onChange={e => f("data", e.target.value)} /></Grp>
              <Grp label="Horário"><input style={S.inp} type="time" value={form.horario} onChange={e => f("horario", e.target.value)} /></Grp>
            </Row>
            <Row>
              <Grp label="Espaço">
                <select style={S.inp} value={form.espaco_id} onChange={e => f("espaco_id", e.target.value)}>
                  <option value="">— sem espaço definido —</option>
                  {espacosDaUnidade.map(e => <option key={e.id} value={e.id}>{e.nome} (cap. {e.capacidade})</option>)}
                </select>
              </Grp>
              <Grp label="Status">
                <select style={S.inp} value={form.status} onChange={e => f("status", e.target.value)}>
                  <option value="confirmada">confirmada</option>
                  <option value="pendente">pendente</option>
                  <option value="cancelada">cancelada</option>
                </select>
              </Grp>
            </Row>
            <Row>
              <Grp label="Observações"><textarea style={{ ...S.inp, minHeight: 64, resize: "vertical" }} value={form.observacoes} onChange={e => f("observacoes", e.target.value)} placeholder="Aniversário, Corporativo, etc." /></Grp>
            </Row>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              {editRes && <button style={{ ...S.btnGhost, color: C.red, borderColor: C.red + "66" }} onClick={excluir}>Excluir</button>}
              <button style={S.btnGhost} onClick={() => setModalOpen(false)}>Cancelar</button>
              <button style={S.btn()} onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : editRes ? "Salvar" : "Criar reserva"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ children }) { return <div style={{ display: "grid", gridTemplateColumns: children.length > 1 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 12 }}>{children}</div>; }
function Grp({ label, children }) { return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</label>{children}</div>; }

function ViewDia({ ds, reservasDoDia, CAP_TOTAL, onEdit }) {
  const dia = reservasDoDia(ds);
  return (
    <div>
      {["almoco", "jantar"].map(turno => {
        const label = turno === "almoco" ? "Almoço" : "Jantar";
        const items = dia.filter(r => getTurno(r.horario) === turno).sort((a, b) => a.horario.localeCompare(b.horario));
        const conf  = items.filter(r => r.status === "confirmada").reduce((a, r) => a + r.qtd_pessoas, 0);
        const pct   = Math.min(100, Math.round((conf / CAP_TOTAL) * 100));
        return (
          <div key={turno} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: C.muted }}>{label}</span>
              <CapBar total={conf} cap={CAP_TOTAL} />
            </div>
            {pct >= 90 && <div style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, background: C.amber + "22", color: C.amber, marginBottom: 8 }}>⚠ Salão próximo do limite — {conf} de {CAP_TOTAL} lugares confirmados</div>}
            {items.length === 0
              ? <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: C.muted, border: `1px dashed ${C.border}`, borderRadius: 10 }}>Nenhuma reserva neste turno</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {items.map(r => (
                  <div key={r.id} onClick={() => onEdit(r)} style={{ display: "grid", gridTemplateColumns: "50px 1fr 56px 100px 110px 10px", alignItems: "center", gap: 10, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", opacity: r.status === "cancelada" ? .4 : 1, background: C.card }}>
                    <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.horario}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.cliente_nome}</div>
                      {r.observacoes && <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.observacoes}</div>}
                    </div>
                    <span style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>👥 {r.qtd_pessoas}</span>
                    <EspacoBadge nome={r.espaco_nome} />
                    <StatusPill status={r.status} />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.status === "confirmada" ? C.green : r.status === "pendente" ? C.amber : C.muted, flexShrink: 0, display: "inline-block" }} />
                  </div>
                ))}
              </div>
            }
          </div>
        );
      })}
    </div>
  );
}

function ViewAgenda({ currentDate, reservasDoDia, CAP_TOTAL, onEdit }) {
  const [abertos, setAbertos] = useState({});
  const days = Array.from({ length: 14 }, (_, i) => addDays(currentDate, i));

  function toggle(ds) { setAbertos(p => ({ ...p, [ds]: !p[ds] })); }

  return (
    <div>
      {days.map(day => {
        const ds    = toDS(day);
        const items = reservasDoDia(ds).sort((a, b) => a.horario.localeCompare(b.horario));
        const conf  = items.filter(r => r.status === "confirmada").reduce((a, r) => a + r.qtd_pessoas, 0);
        const open  = abertos[ds] !== false && (items.length > 0 || abertos[ds] === true);
        return (
          <div key={ds} style={{ borderBottom: `1px solid ${C.border}` }}>
            <div onClick={() => toggle(ds)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", cursor: "pointer", background: C.card }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: isToday(day) ? C.blue : C.text }}>{isToday(day) ? "Hoje — " : ""}{formatShort(day)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {items.length > 0 ? <span style={{ fontSize: 11, color: C.muted }}>{items.length} reserva{items.length > 1 ? "s" : ""} · {conf} confirmados</span> : <span style={{ fontSize: 11, color: C.muted }}>sem reservas</span>}
                <span style={{ color: C.muted }}>{open ? "▲" : "▼"}</span>
              </div>
            </div>
            {open && (
              <div style={{ padding: "8px 20px 12px" }}>
                {items.length === 0
                  ? <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>Sem reservas neste dia</div>
                  : items.map(r => (
                    <div key={r.id} onClick={() => onEdit(r)} style={{ display: "grid", gridTemplateColumns: "50px 50px 1fr 56px 100px 110px", alignItems: "center", gap: 10, padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 3, cursor: "pointer", opacity: r.status === "cancelada" ? .4 : 1, background: C.bg }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.horario}</span>
                      <span style={{ fontSize: 9, textTransform: "uppercase", color: C.muted }}>{getTurnoLabel(r.horario)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.cliente_nome}</div>
                        {r.observacoes && <div style={{ fontSize: 10, color: C.muted }}>{r.observacoes}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>👥 {r.qtd_pessoas}</span>
                      <EspacoBadge nome={r.espaco_nome} />
                      <StatusPill status={r.status} />
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}