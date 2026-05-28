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

// Dicionário de cores atualizado para todos os salões com português correto
const ESPACO_S = {
  "Área Externa":          {bg:"#E1F5EE",color:"#0F6E56"},
  "Área Interna Recepção": {bg:"#EEEDFE",color:"#3C3489"},
  "Salão Crioulas":        {bg:"#FAEEDA",color:"#854F0B"},
  "Salão das Minas":       {bg:"#FCE8F3",color:"#A02062"},
  "Mezanino":              {bg:"#F0E6D2",color:"#633806"},
  "Adega do Fialho":       {bg:"#4A154B",color:"#FFFFFF"},
  "Salão das Artes":       {bg:"#E0F2FE",color:"#026AA7"},
  "Salão dos Lençóis":     {bg:"#FFF9C4",color:"#F57F17"},
  "Salão das Araras":      {bg:"#E8F5E9",color:"#2E7D32"},
  "VIP I":                 {bg:"#EEEDFE",color:"#3C3489"},
  "VIP II":                {bg:"#EEEDFE",color:"#534AB7"},
  "Vista Mar":             {bg:"#E1F5EE",color:"#0F6E56"},
  "Geral":                 {bg:"#2a2a2a",color:"#aaa"},
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
  
  // Controle de permissão de escrita dentro do Modal
  const [isEditing, setIsEditing] = useState(false);

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

  // Filtro Dinâmico: Puxa os salões associados à loja ativa cadastrados via SQL
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

  // NOVA LÓGICA: Abre a tela direto em modo de visualização segura
  function openVisualizar(r){
    setEditRes(r);
    setForm({
      cliente_nome:r.cliente_nome, cliente_contato:r.cliente_contato,
      data:r.data, horario:r.horario, qtd_pessoas:r.qtd_pessoas,
      espaco_id:r.espaco_id||"", status:r.status,
      observacoes:r.observacoes||"", motivo_cancelamento:r.motivo_cancelamento||"",
      tipo_evento: r.tipo_evento||"", nota_fiscal: r.nota_fiscal||"", valor_nota: r.valor_nota||""
    });
    setErroForm("");
    setIsEditing(false); // Trava os inputs inicialmente
    setModalOpen(true);
  }

  // Pede a senha apenas quando clica no botão de edição dentro do modal
  function handleHabilitarEdicao(){
    const pwd = window.prompt("Acesso Restrito: Digite a senha da gerência para liberar a edição:");
    if(pwd === SENHA_GERENCIA){
      setIsEditing(true);
    } else if(pwd !== null) {
      alert("Senha incorreta!");
    }
  }

  // Pede a senha apenas ao acionar o botão de exclusão definitiva
  async function handleExcluirComSenha(){
    const pwd = window.prompt("Acesso Restrito: Digite a senha da gerência para confirmar a exclusão:");
    if(pwd === SENHA_GERENCIA){
      await excluir();
    } else if(pwd !== null) {
      alert("Senha incorreta!");
    }
  }

  function goToReserva(r){
    setBusca(""); setSearchRes([]); setShowSearch(false);
    setAba("reservas");
    setCurrentDate(new Date(r.data+"T12:00:00"));
    setView("dia");
    setTimeout(()=>openVisualizar(r),150);
  }

  function openNova(){
    setEditRes(null);
    setForm({...RES_VAZIO, data:toDS(currentDate), espaco_id:""});
    setErroForm("");
    setIsEditing(true); // Nova reserva abre pronta para digitação
    setModalOpen(true);
  }

  // LÓGICA DE IMPORTAÇÃO E ANÁLISE AUTOMÁTICA DE ARQUIVOS XML (NF-e)
  function handleXMLUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(event.target.result, "text/xml");
        
        // Localiza as tags estruturadas do padrão de Notas Fiscais da Receita Federal
        const nNF = xmlDoc.getElementsByTagName("nNF")[0]?.textContent || "";
        const vNF = xmlDoc.getElementsByTagName("vNF")[0]?.textContent || "";
        
        setForm(p => ({ 
          ...p, 
          nota_fiscal: nNF, 
          valor_nota: vNF ? parseFloat(vNF).toFixed(2) : "" 
        }));
      } catch (err) {
        alert("Erro ao ler o arquivo XML. Certifique-se de carregar um documento de Nota Fiscal válido.");
      }
    };
    reader.readAsText(file);
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
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderBottom:`1px solid ${C.border}`,gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:18,fontWeight:700,color:C.text,letterSpacing:"0.01em"}}>
          🌴 Cabana do Sol <span style={{color:C.muted,fontWeight:400,fontSize:15}}>/ Reservas</span>
        </div>

        {/* Unidades */}
        <div style={{display:"flex",gap:4}}>
          {unidades.map(u=>(
            <button key={u.id} onClick={()=>setUnidadeAtiva(u.id)} style={{...S.btnGhost,fontSize:14,padding:"7px 18px",background:unidadeAtiva===u.id?C.text:"none",color:unidadeAtiva===u.id?C.bg:C.muted,borderColor:unidadeAtiva===u.id?C.text:C.border,fontWeight:unidadeAtiva===u.id?700:400}}>
              {u.nome}
            </button>
          ))}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {/* Busca */}
          <div ref={searchRef} style={{position:"relative"}}>
            <input style={{...S.inp,width:210,paddingLeft:34,fontSize:13}} placeholder="🔍  Buscar cliente..." value={busca} onChange={e=>onBusca(e.target.value)} onFocus={()=>busca.length>=2&&setShowSearch(true)}/>
            {showSearch&&(searchRes.length>0?(
              <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,zIndex:200,maxHeight:360,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>
                {searchRes.map(r=>(
                  <div key={r.id} onClick={()=>goToReserva(r)} style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{fontSize:13,fontWeight:600}}>{r.cliente_nome}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>📞 {r.cliente_contato||"—"}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:C.border,color:C.muted}}>📅 {r.data.split("-").reverse().join("/")}</span>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:C.border,color:C.muted}}>🕐 {r.horario} · {getTurnoLabel(r.horario)}</span>
                      <StatusPill status={r.status}/>
                    </div>
                  </div>
                ))}
              </div>
            ):(
              <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,zIndex:200,padding:16,fontSize:13,color:C.muted,textAlign:"center"}}>Nenhum cliente encontrado</div>
            ))}
          </div>

          {/* Abas */}
          {[["reservas","📋  Reservas"],["relatorio","📊  Relatório"]].map(([v,label])=>(
            <button key={v} onClick={()=>setAba(v)} style={{...S.btnGhost,fontSize:13,padding:"7px 14px",background:aba===v?C.border:"none",color:aba===v?C.text:C.muted}}>
              {label}
            </button>
          ))}

          <button onClick={logout} style={{...S.btnGhost,fontSize:13}}>Sair</button>
        </div>
      </div>

      {aba==="reservas"&&<>
        {/* NAV DATE */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 24px",borderBottom:`1px solid ${C.border}`}}>
          <button onClick={()=>setCurrentDate(d=>addDays(d,view==="dia"?-1:-7))} style={{...S.btnGhost,width:32,padding:0,fontSize:16}}>‹</button>
          <span style={{fontSize:15,fontWeight:600,minWidth:220,textAlign:"center"}}>
            {view==="dia"?formatFull(currentDate):`A partir de ${formatShort(currentDate)}`}
          </span>
          <button onClick={()=>setCurrentDate(d=>addDays(d,view==="dia"?1:7))} style={{...S.btnGhost,width:32,padding:0,fontSize:16}}>›</button>
          <button onClick={()=>setCurrentDate(new Date())} style={{...S.btnGhost,fontSize:12,padding:"4px 10px"}}>Hoje</button>

          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button onClick={()=>setView("dia")} style={{...S.btnGhost,fontSize:13,background:view==="dia"?C.border:"none",color:view==="dia"?C.text:C.muted}}>☰  Dia</button>
            <button onClick={()=>setView("agenda")} style={{...S.btnGhost,fontSize:13,background:view==="agenda"?C.border:"none",color:view==="agenda"?C.text:C.muted}}>📅  Próximos dias</button>
            <button onClick={openNova} style={{...S.btn(),fontSize:13,padding:"7px 16px"}}>+ Nova reserva</button>
          </div>
        </div>

        <div style={{padding:view==="agenda"?0:24}}>
          {view==="dia"
            ?<ViewDia ds={toDS(currentDate)} reservasDoDia={reservasDoDia} CAP_TOTAL={CAP_TOTAL} onEdit={openVisualizar} espacos={espacos}/>
            :<ViewAgenda currentDate={currentDate} reservasDoDia={reservasDoDia} CAP_TOTAL={CAP_TOTAL} onEdit={openVisualizar} espacos={espacos}/>
          }
        </div>
      </>}

      {aba==="relatorio"&&(
        <div style={{padding:24,maxWidth:1100,margin:"0 auto"}}>
          <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>📊 Relatório de Reservas</div>

          {/* Filtros */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:24}}>
            <div style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",marginBottom:14}}>Filtros de Análise</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12,marginBottom:12}}>
              <Grp label="Data inicial"><input style={S.inp} type="date" value={relDataIni} onChange={e=>setRelDataIni(e.target.value)}/></Grp>
              <Grp label="Data final"><input style={S.inp} type="date" value={relDataFim} onChange={e=>setRelDataFim(e.target.value)}/></Grp>
              
              <Grp label="Tipo de Evento">
                <select style={S.inp} value={relTipoEvento} onChange={e=>setRelTipoEvento(e.target.value)}>
                  <option value="todos">Todos os eventos</option>
                  {TIPOS_EVENTO.map(ev=><option key={ev} value={ev}>{ev}</option>)}
                </select>
              </Grp>
              
              <Grp label="Status">
                <select style={S.inp} value={relStatus} onChange={e=>setRelStatus(e.target.value)}>
                  <option value="todos">Todos os status</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="pendente">Pendentes</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </Grp>

              <Grp label="Espaço">
                <select style={S.inp} value={relEspaco} onChange={e=>setRelEspaco(e.target.value)}>
                  <option value="todos">Todos os espaços</option>
                  {espacosDaUnidade.map(e=><option key={e.id} value={e.nome}>{e.nome}</option>)}
                </select>
              </Grp>
            </div>
            
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
              <button onClick={exportarDocx} style={{...S.btn(C.blue,"#fff"),fontSize:13}} disabled={gerandoDoc}>
                {gerandoDoc?"Gerando...":"📄  Exportar relatório (.docx)"}
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
            {[
              {label:"Total de reservas",val:relStats.total,cor:C.blue},
              {label:"Total de pessoas",val:relStats.totalPessoas,cor:C.accent},
              {label:"Faturamento (NF)",val:formatMoney(relStats.faturamento),cor:"#8A4BDE"},
              {label:"Confirmadas",val:relStats.confirmadas,cor:C.green},
              {label:"Canceladas",val:relStats.canceladas,cor:C.red},
            ].map(({label,val,cor})=>(
              <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,textAlign:"center"}}>
                <div style={{fontSize:label.includes("Faturamento")?22:28,fontWeight:700,color:cor,marginTop:label.includes("Faturamento")?4:0}}>{val}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Listas Inferiores */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
            {/* Horários */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Horários mais frequentes</div>
              {relStats.horarios.length===0?<div style={{fontSize:12,color:C.muted}}>Sem dados</div>:relStats.horarios.map(([h,n])=>(
                <div key={h} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:13}}>{h}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:80,height:6,borderRadius:99,background:C.border,overflow:"hidden"}}>
                      <div style={{width:`${Math.min(100,(n/relStats.horarios[0][1])*100)}%`,height:"100%",background:C.accent,borderRadius:99}}/>
                    </div>
                    <span style={{fontSize:12,color:C.muted,width:20,textAlign:"right"}}>{n}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Espaços */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Espaços mais utilizados</div>
              {relStats.espacosTop.length===0?<div style={{fontSize:12,color:C.muted}}>Sem dados</div>:relStats.espacosTop.map(([e,n])=>(
                <div key={e} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:13}}>{e}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:80,height:6,borderRadius:99,background:C.border,overflow:"hidden"}}>
                      <div style={{width:`${Math.min(100,(n/relStats.espacosTop[0][1])*100)}%`,height:"100%",background:C.blue,borderRadius:99}}/>
                    </div>
                    <span style={{fontSize:12,color:C.muted,width:20,textAlign:"right"}}>{n}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista em Tabela Atualizada */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:600}}>
              Lista de reservas detalhada ({relDados.length})
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:C.bg}}>
                    {["Cliente","Data","Horário","Pessoas","Espaço","Evento","NF","Valor NF","Status"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",color:C.muted,fontWeight:500,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relDados.sort((a,b)=>a.data.localeCompare(b.data)||a.horario.localeCompare(b.horario)).map(r=>(
                    <tr key={r.id} onClick={()=>openVisualizar(r)} style={{cursor:"pointer",opacity:r.status==="cancelada"?.5:1}}>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`}}>{r.cliente_nome}</td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{r.data.split("-").reverse().join("/")}</td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`}}>{r.horario}</td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,textAlign:"center"}}>{r.qtd_pessoas}</td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`}}><EspacoBadge nome={espacos.find(e=>e.id===r.espaco_id)?.nome||""}/></td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,color:C.muted}}>{r.tipo_evento||"—"}</td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,color:C.muted}}>{r.nota_fiscal||"—"}</td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,color:C.muted,fontWeight:600}}>{r.valor_nota ? formatMoney(r.valor_nota) : "—"}</td>
                      <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`}}><StatusPill status={r.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO EXCEL FLUTUANTE */}
      <button onClick={exportarExcel} title="Exportar backup Excel" style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:"50%",background:"#1D6F42",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 4px 16px rgba(0,0,0,.4)",zIndex:100}}>
        📊
      </button>

      {/* MODAL INTELIGENTE DE VISUALIZAÇÃO / EDIÇÃO */}
      {modalOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setModalOpen(false)}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:24,width:"92%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:18}}>
              {!editRes ? "Nova Reserva" : isEditing ? "Editar Reserva" : "Visualizar Detalhes da Reserva"}
            </div>
            {erroForm&&<div style={{fontSize:12,color:C.red,marginBottom:12,padding:"8px 10px",background:C.red+"18",borderRadius:8}}>{erroForm}</div>}
            
            <Row>
              <Grp label="Nome do cliente">
                <input style={S.inp} value={form.cliente_nome} onChange={e=>f("cliente_nome",e.target.value)} placeholder="Ex: Airton Comercial" disabled={!isEditing}/>
              </Grp>
            </Row>
            
            <Row>
              <Grp label="Contato">
                <input style={S.inp} value={form.cliente_contato} onChange={e=>f("cliente_contato",e.target.value)} placeholder="98 99999-0000" disabled={!isEditing}/>
              </Grp>
              <Grp label="Nº de pessoas">
                <input style={S.inp} type="number" min="1" value={form.qtd_pessoas} onChange={e=>f("qtd_pessoas",e.target.value)} disabled={!isEditing}/>
              </Grp>
            </Row>
            
            <Row>
              <Grp label="Data">
                <input style={S.inp} type="date" value={form.data} onChange={e=>f("data",e.target.value)} disabled={!isEditing}/>
              </Grp>
              <Grp label="Horário">
                <input style={S.inp} type="time" value={form.horario} onChange={e=>f("horario",e.target.value)} disabled={!isEditing}/>
              </Grp>
            </Row>

            <Row>
              <Grp label="Tipo de Evento">
                <select style={S.inp} value={form.tipo_evento} onChange={e=>f("tipo_evento",e.target.value)} disabled={!isEditing}>
                  <option value="">— selecione —</option>
                  {TIPOS_EVENTO.map(ev=><option key={ev} value={ev}>{ev}</option>)}
                </select>
              </Grp>
              <Grp label="Nota Fiscal">
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input style={S.inp} value={form.nota_fiscal} onChange={e=>f("nota_fiscal",e.target.value)} placeholder="Nº da NF" disabled={!isEditing}/>
                  {isEditing && (
                    <label style={{ ...S.btn(C.border, C.text), padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Anexar arquivo XML da Nota Fiscal">
                      📂
                      <input type="file" accept=".xml" onChange={handleXMLUpload} style={{ display: "none" }} />
                    </label>
                  )}
                </div>
              </Grp>
              <Grp label="Valor da Nota (R$)">
                <input style={S.inp} type="number" step="0.01" value={form.valor_nota} onChange={e=>f("valor_nota",e.target.value)} placeholder="0.00" disabled={!isEditing}/>
              </Grp>
            </Row>
            
            <Row>
              <Grp label="Espaço">
                <select style={S.inp} value={form.espaco_id} onChange={e=>f("espaco_id",e.target.value)} disabled={!isEditing}>
                  <option value="">— sem espaço definido —</option>
                  {espacosDaUnidade.map(e=><option key={e.id} value={e.id}>{e.nome} · {e.capacidade} lugares</option>)}
                </select>
              </Grp>
              <Grp label="Status">
                <select style={S.inp} value={form.status} onChange={e=>f("status",e.target.value)} disabled={!isEditing}>
                  <option value="confirmada">confirmada</option>
                  <option value="pendente">pendente</option>
                  <option value="cancelada">cancelada</option>
                </select>
              </Grp>
            </Row>

            {form.status==="cancelada"&&(
              <Row>
                <Grp label="⚠ Motivo do cancelamento (obrigatório)">
                  <textarea style={{...S.inp,minHeight:64,resize:"vertical",borderColor:C.red+"66"}} value={form.motivo_cancelamento} onChange={e=>f("motivo_cancelamento",e.target.value)} placeholder="Descreva o motivo do cancelamento..." disabled={!isEditing}/>
                </Grp>
              </Row>
            )}
            
            <Row>
              <Grp label="Observações">
                <textarea style={{...S.inp,minHeight:56,resize:"vertical"}} value={form.observacoes} onChange={e=>f("observacoes",e.target.value)} placeholder="Detalhes, pedidos especiais..." disabled={!isEditing}/>
              </Grp>
            </Row>
            
            {/* Controle Inteligente dos Botões de Ação do Rodapé */}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
              {!isEditing ? (
                <>
                  {editRes && <button style={{...S.btnGhost,color:C.red,borderColor:C.red+"66"}} onClick={handleExcluirComSenha}>Excluir Reserva</button>}
                  <button style={S.btnGhost} onClick={()=>setModalOpen(false)}>Fechar</button>
                  <button style={S.btn(C.blue, "#fff")} onClick={handleHabilitarEdicao}>Editar Dados</button>
                </>
              ) : (
                <>
                  <button style={S.btnGhost} onClick={editRes ? () => setIsEditing(false) : () => setModalOpen(false)}>Cancelar</button>
                  <button style={S.btn()} onClick={salvar} disabled={salvando}>{salvando?"Salvando...":editRes?"Salvar alterações":"Criar reserva"}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({children}){ return <div style={{display:"grid",gridTemplateColumns:children.length>2?"1fr 1fr 1fr":children.length>1?"1fr 1fr":"1fr",gap:12,marginBottom:12}}>{children}</div>; }
function Grp({label,children}){ return <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={{fontSize:10,color:C.muted,fontWeight:600,letterSpacing:".05em",textTransform:"uppercase"}}>{label}</label>{children}</div>; }

function ViewDia({ds,reservasDoDia,CAP_TOTAL,onEdit,espacos}){
  const dia=reservasDoDia(ds);
  return(
    <div>
      {["almoco","jantar"].map(turno=>{
        const label=turno==="almoco"?"Almoço":"Jantar";
        const items=dia.filter(r=>getTurno(r.horario)===turno).sort((a,b)=>a.horario.localeCompare(b.horario));
        const conf=items.filter(r=>r.status==="confirmada").reduce((a,r)=>a+r.qtd_pessoas,0);
        const pct=Math.min(100,Math.round((conf/CAP_TOTAL)*100));
        return(
          <div key={turno} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:12}}>
              <span style={{fontSize:11,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:C.muted}}>{label}</span>
              <CapBar total={conf} cap={CAP_TOTAL}/>
            </div>
            {pct>=90&&<div style={{fontSize:11,padding:"6px 10px",borderRadius:8,background:C.amber+"22",color:C.amber,marginBottom:8}}>⚠ Salão próximo do limite — {conf} de {CAP_TOTAL} lugares confirmados</div>}
            {items.length===0
              ?<div style={{padding:20,textAlign:"center",fontSize:13,color:C.muted,border:`1px dashed ${C.border}`,borderRadius:10}}>Nenhuma reserva neste turno</div>
              :<div style={{display:"flex",flexDirection:"column",gap:3}}>
                {items.map(r=>(
                  <div key={r.id} onClick={()=>onEdit(r)} style={{display:"grid",gridTemplateColumns:"50px 1fr 52px 100px 110px 10px",alignItems:"center",gap:10,padding:"8px 12px",border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",opacity:r.status==="cancelada"?.4:1,background:C.card}}>
                    <span style={{fontSize:13,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{r.horario}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.cliente_nome} {r.tipo_evento&&<span style={{fontSize:10,color:C.muted}}>({r.tipo_evento})</span>}</div>
                      {r.observacoes&&<div style={{fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.observacoes}</div>}
                      {r.motivo_cancelamento&&<div style={{fontSize:10,color:C.red,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>❌ {r.motivo_cancelamento}</div>}
                    </div>
                    <span style={{fontSize:12,color:C.muted,textAlign:"right"}}>👥 {r.qtd_pessoas}</span>
                    <EspacoBadge nome={espacos.find(e=>e.id===r.espaco_id)?.nome||""}/>
                    <StatusPill status={r.status}/>
                    <span style={{width:8,height:8,borderRadius:"50%",background:r.status==="confirmada"?C.green:r.status==="pendente"?C.amber:C.muted,flexShrink:0,display:"inline-block"}}/>
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

function ViewAgenda({currentDate,reservasDoDia,CAP_TOTAL,onEdit,espacos}){
  const [abertos,setAbertos]=useState({});
  const days=Array.from({length:14},(_,i)=>addDays(currentDate,i));
  function toggle(ds){ setAbertos(p=>({...p,[ds]:!p[ds]})); }
  return(
    <div>
      {days.map(day=>{
        const ds=toDS(day);
        const items=reservasDoDia(ds).sort((a,b)=>a.horario.localeCompare(b.horario));
        const conf=items.filter(r=>r.status==="confirmada").reduce((a,r)=>a+r.qtd_pessoas,0);
        const open=abertos[ds]!==false&&(items.length>0||abertos[ds]===true);
        return(
          <div key={ds} style={{borderBottom:`1px solid ${C.border}`}}>
            <div onClick={()=>toggle(ds)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",cursor:"pointer",background:C.card}}>
              <span style={{fontSize:14,fontWeight:600,color:isToday(day)?C.blue:C.text}}>{isToday(day)?"Hoje — ":""}{formatShort(day)}</span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {items.length>0?<span style={{fontSize:11,color:C.muted}}>{items.length} reserva{items.length>1?"s":""} · {conf} confirmados</span>:<span style={{fontSize:11,color:C.muted}}>sem reservas</span>}
                <span style={{color:C.muted}}>{open?"▲":"▼"}</span>
              </div>
            </div>
            {open&&(
              <div style={{padding:"8px 24px 12px"}}>
                {items.length===0
                  ?<div style={{fontSize:12,color:C.muted,padding:"8px 0"}}>Sem reservas neste dia</div>
                  :items.map(r=>(
                    <div key={r.id} onClick={()=>onEdit(r)} style={{display:"grid",gridTemplateColumns:"50px 50px 1fr 52px 100px 110px",alignItems:"center",gap:10,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:10,marginBottom:3,cursor:"pointer",opacity:r.status==="cancelada"?.4:1,background:C.bg}}>
                      <span style={{fontSize:13,fontWeight:600}}>{r.horario}</span>
                      <span style={{fontSize:9,textTransform:"uppercase",color:C.muted}}>{getTurnoLabel(r.horario)}</span>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.cliente_nome} {r.tipo_evento&&<span style={{fontSize:10,color:C.muted}}>({r.tipo_evento})</span>}</div>
                        {r.observacoes&&<div style={{fontSize:10,color:C.muted}}>{r.observacoes}</div>}
                        {r.motivo_cancelamento&&<div style={{fontSize:10,color:C.red}}>❌ {r.motivo_cancelamento}</div>}
                      </div>
                      <span style={{fontSize:12,color:C.muted,textAlign:"right"}}>👥 {r.qtd_pessoas}</span>
                      <EspacoBadge nome={espacos.find(e=>e.id===r.espaco_id)?.nome||""}/>
                      <StatusPill status={r.status}/>
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
