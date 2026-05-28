import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// --- CONFIGURAÇÕES ---
const SENHA_GERENCIA = "cabana123"; // SENHA PARA EDITAR/EXCLUIR
const TIPOS_EVENTO = ["Aniversário", "Empresarial", "Casamento", "Formatura", "Confraternização", "Particular", "Outro"];

const SUPABASE_URL = "https://wbzpfcuoytgadcnstcue.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndienBmY3VveXRnYWRjbnN0Y3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTI4ODUsImV4cCI6MjA5NTQyODg4NX0.vL7NP0-781gusMMNeqNTTUdQNTxAKr4Gtoo4Y8hQOtY";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const loadXLSX = () => new Promise(resolve => {
  if (window.XLSX) { resolve(window.XLSX); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  s.onload = () => resolve(window.XLSX);
  document.head.appendChild(s);
});

const loadDocx = () => new Promise((resolve, reject) => {
  if (window.docx) { resolve(window.docx); return; }
  const s = document.createElement("script");
  s.src = "https://unpkg.com/docx@8.5.0/build/index.umd.js"; 
  s.onload = () => {
    if (window.docx) {
      resolve(window.docx);
    } else {
      reject(new Error("Biblioteca 'docx' não injetada corretamente."));
    }
  };
  s.onerror = () => reject(new Error("Falha ao carregar o script do 'docx'."));
  document.head.appendChild(s);
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const DIAS_CURTO = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const C = {
  bg:"#0f0f0f", card:"#1a1a1a", border:"#2a2a2a", text:"#e8e6df",
  muted:"#888780", accent:"#f5a623", blue:"#378ADD", green:"#639922",
  red:"#E24B4A", amber:"#BA7517", purple:"#534AB7", teal:"#0F6E56",
};

const S = {
  inp: { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"7px 10px", fontSize:13, width:"100%", outline:"none" },
  btn: (bg=C.accent, color="#000") => ({ background:bg, color, border:"none", borderRadius:8, padding:"7px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }),
  btnGhost: { background:"none", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, padding:"7px 14px", fontSize:13, cursor:"pointer" },
};

function toDS(d){ return d.toISOString().slice(0,10); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function formatFull(d){ return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
function formatShort(d){ return `${DIAS_CURTO[d.getDay()]}, ${d.getDate()} ${MESES_CURTO[d.getMonth()]}`; }
function isToday(d){ return d.toDateString()===new Date().toDateString(); }
function getTurno(h){ return parseInt(h)<17?"almoco":"jantar"; }
function getTurnoLabel(h){ return parseInt(h)<17?"Almoço":"Jantar"; }
function formatMoney(n){ return Number(n||0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"}); }

const ESPACO_S = {
  "VIP I":    {bg:"#EEEDFE",color:"#3C3489"},
  "VIP II":   {bg:"#EEEDFE",color:"#534AB7"},
  "Vista Mar":{bg:"#E1F5EE",color:"#0F6E56"},
  "Geral":    {bg:"#2a2a2a",color:"#aaa"},
  "Mezanino": {bg:"#FAEEDA",color:"#633806"},
};
const STATUS_S = {
  confirmada:{bg:"#EAF3DE",color:"#3B6D11"},
  pendente:  {bg:"#FAEEDA",color:"#854F0B"},
  cancelada: {bg:"#2a2a2a",color:"#888"},
};

function EspacoBadge({nome}){
  if(!nome) return <span style={{fontSize:11,color:C.muted}}>—</span>;
  const s=ESPACO_S[nome]||{bg:"#2a2a2a",color:"#aaa"};
  return <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>{nome}</span>;
}
function StatusPill({status}){
  const s=STATUS_S[status]||{};
  return <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:s.bg,color:s.color}}>{status}</span>;
}
function CapBar({total,cap}){
  const pct=Math.min(100,Math.round((total/cap)*100));
  const cor=pct>=90?C.red:pct>=70?C.amber:C.green;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,maxWidth:280}}>
      <div style={{flex:1,height:4,borderRadius:99,background:C.border,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:cor,borderRadius:99,transition:"width .4s"}}/>
      </div>
      <span style={{fontSize:11,color:pct>=90?C.red:C.muted,whiteSpace:"nowrap"}}>{total} de {cap} confirmados</span>
    </div>
  );
}

const RES_VAZIO = {cliente_nome:"",cliente_contato:"",data:"",horario:"12:00",qtd_pessoas:"",espaco_id:"",status:"pendente",observacoes:"",motivo_cancelamento:"",tipo_evento:"",nota_fiscal:"",valor_nota:""};

export default function App(){
  const [usuario,setUsuario]     = useState(null);
  const [authLoad,setAuthLoad]   = useState(true);
  const [email,setEmail]         = useState("");
  const [senha,setSenha]         = useState("");
  const [erroAuth,setErroAuth]   = useState("");
  const [loadingAuth,setLoadingAuth] = useState(false);

  const [unidades,setUnidades]   = useState([]);
  const [espacos,setEspacos]     = useState([]);
  const [reservas,setReservas]   = useState([]);
  const [loading,setLoading]     = useState(true);

  const [unidadeAtiva,setUnidadeAtiva] = useState(null);
  const [currentDate,setCurrentDate]   = useState(new Date());
  const [view,setView]                 = useState("dia");
  const [aba,setAba]                   = useState("reservas");

  const [busca,setBusca]       = useState("");
  const [searchRes,setSearchRes] = useState([]);
  const [showSearch,setShowSearch] = useState(false);
  const searchRef = useRef(null);

  const [modalOpen,setModalOpen]   = useState(false);
  const [editRes,setEditRes]       = useState(null);
  const [form,setForm]             = useState(RES_VAZIO);
  const [salvando,setSalvando]     = useState(false);
  const [erroForm,setErroForm]     = useState("");

  // Relatório Filtros
  const [relDataIni,setRelDataIni]   = useState("");
  const [relDataFim,setRelDataFim]   = useState("");
  const [relStatus,setRelStatus]     = useState("todos");
  const [relEspaco,setRelEspaco]     = useState("todos");
  const [relTurno,setRelTurno]       = useState("todos");
  const [relTipoEvento,setRelTipoEvento] = useState("todos");
  const [gerandoDoc,setGerandoDoc]   = useState(false);

  useEffect(()=>{
    sb.auth.getSession().then(({data})=>{ setUsuario(data.session?.user||null); setAuthLoad(false); });
    const {data:{subscription}} = sb.auth.onAuthStateChange((_,session)=>setUsuario(session?.user||null));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!usuario) return;
    async function load(){
      setLoading(true);
      const [{data:u},{data:e},{data:r}] = await Promise.all([
        sb.from("unidades").select("*").eq("ativo",true).order("nome"),
        sb.from("espacos").select("*").eq("ativo",true).order("nome"),
        sb.from("reservas").select("*, clientes(nome,contato)").order("data").order("horario"),
      ]);
      setUnidades(u||[]);
      setEspacos(e||[]);
      const mapped=(r||[]).map(x=>({...x, cliente_nome:x.clientes?.nome||"", cliente_contato:x.clientes?.contato||""}));
      setReservas(mapped);
      if(u&&u.length>0) setUnidadeAtiva(u[0].id);
      setLoading(false);
    }
    load();
  },[usuario]);

  useEffect(()=>{
    function h(e){ if(searchRef.current&&!searchRef.current.contains(e.target)) setShowSearch(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    const now=new Date();
    const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,"0");
    setRelDataIni(`${y}-${m}-01`);
    setRelDataFim(toDS(now));
  },[]);

  async function login(e){
    e.preventDefault(); setLoadingAuth(true); setErroAuth("");
    const {error}=await sb.auth.signInWithPassword({email:email.trim(),password:senha});
    setLoadingAuth(false);
    if(error) setErroAuth("E-mail ou senha incorretos.");
  }
  async function logout(){ await sb.auth.signOut(); }

  const espacosDaUnidade = useMemo(()=>espacos.filter(e=>e.unidade_id===unidadeAtiva),[espacos,unidadeAtiva]);
  const CAP_TOTAL = useMemo(()=>espacosDaUnidade.reduce((a,e)=>a+e.capacidade,0)||200,[espacosDaUnidade]);
  const reservasDoDia = useCallback((ds)=>reservas.filter(r=>r.unidade_id===unidadeAtiva&&r.data===ds),[reservas,unidadeAtiva]);

  function onBusca(q){
    setBusca(q);
    if(q.trim().length<2){ setSearchRes([]); setShowSearch(false); return; }
    const term=q.toLowerCase();
    const found=reservas.filter(r=>r.unidade_id===unidadeAtiva&&r.cliente_nome.toLowerCase().includes(term));
    setSearchRes(found.slice(0,8));
    setShowSearch(true);
  }

  // CONTROLE DE SENHA PARA EDIÇÃO
  function attemptEdit(r){
    const pwd = window.prompt("Acesso Restrito: Digite a senha da gerência para editar/excluir:");
    if(pwd === SENHA_GERENCIA){
      openEdit(r);
    } else if(pwd !== null) {
      alert("Senha incorreta!");
    }
  }

  function goToReserva(r){
    setBusca(""); setSearchRes([]); setShowSearch(false);
    setAba("reservas");
    setCurrentDate(new Date(r.data+"T12:00:00"));
    setView("dia");
    setTimeout(()=>attemptEdit(r),150);
  }

  function openNova(){
    setEditRes(null);
    setForm({...RES_VAZIO, data:toDS(currentDate), espaco_id:""});
    setErroForm(""); setModalOpen(true);
  }

  function openEdit(r){
    setEditRes(r);
    setForm({
      cliente_nome:r.cliente_nome, cliente_contato:r.cliente_contato,
      data:r.data, horario:r.horario, qtd_pessoas:r.qtd_pessoas,
      espaco_id:r.espaco_id||"", status:r.status,
      observacoes:r.observacoes||"", motivo_cancelamento:r.motivo_cancelamento||"",
      tipo_evento: r.tipo_evento||"", nota_fiscal: r.nota_fiscal||"", valor_nota: r.valor_nota||""
    });
    setErroForm(""); setModalOpen(true);
  }

  async function salvar(){
    if(!form.cliente_nome.trim()){ setErroForm("Informe o nome do cliente."); return; }
    if(!form.data){ setErroForm("Informe a data."); return; }
    if(!form.qtd_pessoas){ setErroForm("Informe a quantidade de pessoas."); return; }
    if(form.status==="cancelada"&&!form.motivo_cancelamento.trim()){ setErroForm("Informe o motivo do cancelamento."); return; }
    setSalvando(true); setErroForm("");
    try{
      let cliente_id=editRes?.cliente_id;
      if(!editRes){
        const {data:c,error:ce}=await sb.from("clientes").insert({nome:form.cliente_nome.trim(),contato:form.cliente_contato.trim()}).select().single();
        if(ce) throw ce;
        cliente_id=c.id;
      } else {
        await sb.from("clientes").update({nome:form.cliente_nome.trim(),contato:form.cliente_contato.trim()}).eq("id",cliente_id);
      }
      const payload={
        unidade_id:unidadeAtiva, cliente_id,
        data:form.data, horario:form.horario,
        qtd_pessoas:parseInt(form.qtd_pessoas),
        espaco_id:form.espaco_id||null,
        status:form.status,
        observacoes:form.observacoes.trim(),
        motivo_cancelamento:form.status==="cancelada"?form.motivo_cancelamento.trim():"",
        tipo_evento: form.tipo_evento||null,
        nota_fiscal: form.nota_fiscal.trim()||null,
        valor_nota: form.valor_nota ? Number(form.valor_nota) : null,
      };
      if(editRes){
        const {error}=await sb.from("reservas").update(payload).eq("id",editRes.id);
        if(error) throw error;
        setReservas(prev=>prev.map(r=>r.id===editRes.id?{...r,...payload,cliente_nome:form.cliente_nome,cliente_contato:form.cliente_contato}:r));
      } else {
        const {data:nr,error}=await sb.from("reservas").insert(payload).select().single();
        if(error) throw error;
        setReservas(prev=>[...prev,{...nr,cliente_nome:form.cliente_nome,cliente_contato:form.cliente_contato}]);
      }
      setModalOpen(false);
    } catch(err){ setErroForm(err.message||"Erro ao salvar."); }
    setSalvando(false);
  }

  async function excluir(){
    if(!editRes) return;
    if(!window.confirm("Excluir esta reserva definitivamente?")) return;
    await sb.from("reservas").delete().eq("id",editRes.id);
    setReservas(prev=>prev.filter(r=>r.id!==editRes.id));
    setModalOpen(false);
  }

  function f(k,v){ setForm(p=>({...p,[k]:v})); }

  // EXPORTAR EXCEL
  async function exportarExcel(){
    const XLSX = await loadXLSX();
    const unidsMap = {};
    unidades.forEach(u=>{ unidsMap[u.id]=u.nome; });
    const espsMap = {};
    espacos.forEach(e=>{ espsMap[e.id]=e.nome; });

    const wb = XLSX.utils.book_new();
    for(const unid of unidades){
      const rows = reservas.filter(r=>r.unidade_id===unid.id);
      const data = [
        ["NOME CLIENTE","CONTATO","DATA","HORÁRIO","QTD","ALMOÇO/JANTAR","TIPO EVENTO","ESPAÇO","STATUS","NF","VALOR NF","OBSERVAÇÕES","MOTIVO CANCELAMENTO"],
        ...rows.map(r=>[
          r.cliente_nome, r.cliente_contato, r.data, r.horario, r.qtd_pessoas,
          getTurnoLabel(r.horario), r.tipo_evento||"", espsMap[r.espaco_id]||"", r.status, r.nota_fiscal||"", r.valor_nota||0, r.observacoes||"", r.motivo_cancelamento||""
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [{wch:30},{wch:16},{wch:12},{wch:8},{wch:6},{wch:10},{wch:16},{wch:12},{wch:12},{wch:10},{wch:12},{wch:30},{wch:30}];
      XLSX.utils.book_append_sheet(wb, ws, unid.nome.slice(0,31));
    }
    XLSX.writeFile(wb, `cabana_reservas_${toDS(new Date())}.xlsx`);
  }

  // EXPORTAR DOCX
  async function exportarDocx(){
    setGerandoDoc(true);
    try {
      const docxLib = await loadDocx();
      if (!docxLib) throw new Error("Não foi possível carregar a biblioteca de relatórios.");

      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle } = docxLib;

      const unidNome = unidades.find(u => u.id === unidadeAtiva)?.nome || "";
      const espsMap = {};
      espacos.forEach(e => { espsMap[e.id] = e.nome; });

      function bold(text, size = 22) { return new TextRun({ text, bold: true, size }); }
      function normal(text, size = 20) { return new TextRun({ text, size }); }
      function par(runs, alignment = AlignmentType.LEFT) { return new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment }); }
      function h1(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }); }
      function h2(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { after: 120, before: 240 } }); }
      function space() { return new Paragraph({ text: "", spacing: { after: 120 } }); }

      const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      function cellStyle(text, isHeader = false) {
        return new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(text || ""), bold: isHeader, size: 18 })], spacing: { before: 60, after: 60 } })],
          borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" }, left: noBorder, right: noBorder },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        });
      }

      const periodo = relDataIni && relDataFim ? `${relDataIni.split("-").reverse().join("/")} a ${relDataFim.split("-").reverse().join("/")}` : "Todos os períodos";

      const doc = new Document({
        sections: [{
          properties: {}, 
          children: [
            h1(`Relatório de Reservas — Cabana do Sol`),
            par([bold(`Unidade: `), normal(unidNome)]),
            par([bold(`Período: `), normal(periodo)]),
            par([bold(`Gerado em: `), normal(new Date().toLocaleString("pt-BR"))]),
            space(),

            h2("Resumo Financeiro e Operacional"),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
              new TableRow({ children: [cellStyle("Total de reservas", true), cellStyle(relStats.total, true), cellStyle("Total de pessoas", true), cellStyle(relStats.totalPessoas, true)] }),
              new TableRow({ children: [cellStyle("Confirmadas"), cellStyle(relStats.confirmadas), cellStyle("Canceladas"), cellStyle(relStats.canceladas)] }),
              new TableRow({ children: [cellStyle("Pendentes"), cellStyle(relStats.pendentes), cellStyle("Faturamento (NF)"), cellStyle(formatMoney(relStats.faturamento), true)] }),
            ] }),
            space(),

            h2("Horários mais frequentes"),
            new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, rows: [
              new TableRow({ children: [cellStyle("Horário", true), cellStyle("Reservas", true)] }),
              ...relStats.horarios.map(([h, n]) => new TableRow({ children: [cellStyle(h), cellStyle(n)] })),
            ] }),
            space(),

            h2("Espaços mais utilizados"),
            new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, rows: [
              new TableRow({ children: [cellStyle("Espaço", true), cellStyle("Reservas", true)] }),
              ...relStats.espacosTop.map(([e, n]) => new TableRow({ children: [cellStyle(e), cellStyle(n)] })),
            ] }),
            space(),

            ...(relStats.cancelMotivos.length > 0 ? [
              h2("Cancelamentos com motivo registrado"),
              new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
                new TableRow({ children: [cellStyle("Cliente", true), cellStyle("Data", true), cellStyle("Motivo", true)] }),
                ...relStats.cancelMotivos.map(r => new TableRow({ children: [
                  cellStyle(r.cliente_nome),
                  cellStyle(r.data.split("-").reverse().join("/")),
                  cellStyle(r.motivo_cancelamento),
                ] })),
              ] }),
              space(),
            ] : []),

            h2("Lista de reservas"),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
              new TableRow({ children: [cellStyle("Cliente", true), cellStyle("Data/Hora", true), cellStyle("Pessoas", true), cellStyle("Evento", true), cellStyle("NF", true), cellStyle("Valor NF", true)] }),
              ...relDados.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario)).map(r => new TableRow({ children: [
                cellStyle(r.cliente_nome),
                cellStyle(`${r.data.split("-").reverse().join("/")} às ${r.horario}`),
                cellStyle(r.qtd_pessoas),
                cellStyle(r.tipo_evento || "—"),
                cellStyle(r.nota_fiscal || "—"),
                cellStyle(r.valor_nota ? formatMoney(r.valor_nota) : "—"),
              ] })),
            ] }),
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; 
      a.download = `relatorio_reservas_${toDS(new Date())}.docx`;
      a.click(); 
      URL.revokeObjectURL(url);

    } catch(err) { 
      console.error(err);
      alert("Erro ao gerar DOCX: " + err.message); 
    }
    setGerandoDoc(false);
  }

  // Dados filtrados do Relatório
  const relDados = useMemo(()=>{
    let lista = reservas.filter(r=>r.unidade_id===unidadeAtiva);
    if(relDataIni) lista=lista.filter(r=>r.data>=relDataIni);
    if(relDataFim) lista=lista.filter(r=>r.data<=relDataFim);
    if(relStatus!=="todos") lista=lista.filter(r=>r.status===relStatus);
    if(relTipoEvento!=="todos") lista=lista.filter(r=>r.tipo_evento===relTipoEvento);
    if(relEspaco!=="todos") lista=lista.filter(r=>{
      const nome=espacos.find(e=>e.id===r.espaco_id)?.nome||"";
      return nome===relEspaco;
    });
    if(relTurno!=="todos") lista=lista.filter(r=>getTurno(r.horario)===relTurno);
    return lista;
  },[reservas,unidadeAtiva,relDataIni,relDataFim,relStatus,relEspaco,relTurno,relTipoEvento,espacos]);

  const relStats = useMemo(()=>{
    const total       = relDados.length;
    const totalPessoas= relDados.reduce((a,r)=>a+r.qtd_pessoas,0);
    const faturamento = relDados.reduce((a,r)=>a+Number(r.valor_nota||0),0);
    const confirmadas = relDados.filter(r=>r.status==="confirmada").length;
    const canceladas  = relDados.filter(r=>r.status==="cancelada").length;
    const pendentes   = relDados.filter(r=>r.status==="pendente").length;

    const horMap={};
    relDados.forEach(r=>{ horMap[r.horario]=(horMap[r.horario]||0)+1; });
    const horarios=Object.entries(horMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const espMap={};
    relDados.forEach(r=>{
      const n=espacos.find(e=>e.id===r.espaco_id)?.nome||"Não definido";
      espMap[n]=(espMap[n]||0)+1;
    });
    const espacosTop=Object.entries(espMap).sort((a,b)=>b[1]-a[1]);

    const diaMap={};
    relDados.forEach(r=>{
      const d=new Date(r.data+"T12:00:00");
      const dia=DIAS[d.getDay()];
      diaMap[dia]=(diaMap[dia]||0)+1;
    });
    const diasSemana=Object.entries(diaMap).sort((a,b)=>b[1]-a[1]);

    const cancelMotivos=relDados.filter(r=>r.status==="cancelada"&&r.motivo_cancelamento);

    return {total,totalPessoas,faturamento,confirmadas,canceladas,pendentes,horarios,espacosTop,diasSemana,cancelMotivos};
  },[relDados,espacos]);

  if(authLoad) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:C.muted,fontSize:14}}>Carregando...</div>;

  if(!usuario) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg}}>
      <form onSubmit={login} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:32,width:340}}>
        <div style={{fontSize:22,fontWeight:700,color:C.accent,marginBottom:4}}>Cabana do Sol</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:24}}>Sistema de Reservas</div>
        {erroAuth&&<div style={{fontSize:12,color:C.red,marginBottom:12,padding:"8px 10px",background:C.red+"18",borderRadius:8}}>{erroAuth}</div>}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>E-MAIL</label>
          <input style={S.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>SENHA</label>
          <input style={S.inp} type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/>
        </div>
        <button type="submit" style={{...S.btn(),width:"100%"}} disabled={loadingAuth}>{loadingAuth?"Entrando...":"Entrar"}</button>
      </form>
    </div>
  );

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:C.muted,fontSize:14}}>Carregando dados...</div>;

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,paddingBottom:80}}>

      {/* TOPBAR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space
