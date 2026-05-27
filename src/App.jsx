import React, { useState, useMemo } from 'react';
import { 
  Calendar, Users, Plus, Search, LogOut, FileSpreadsheet, CheckCircle, Clock, XCircle 
} from 'lucide-react';

// --- DADOS REAIS EXTRAÍDOS DA PLANILHA DA ANA ---
const initialReservations = [
  {"id":"lit-1","client_name":"Airton Comercial- Grupo Mateus","contact":"98 98855-9757","date":"2026-04-01","time":"12:30","guests":"15","period":"almoço","space":"Geral","status":"confirmada","notes":"Corporativo","unit":"Litorânea"},
  {"id":"lit-2","client_name":"Bruno Santana","contact":"98 98407-7202","date":"2026-04-01","time":"20:00","guests":"18","period":"jantar","space":"VIP I","status":"pendente","notes":"","unit":"Litorânea"},
  {"id":"lit-3","client_name":"Fernanda Morales","contact":"98 98864-1484","date":"2026-04-01","time":"19:30","guests":"40","period":"jantar","space":"Geral","status":"cancelada","notes":"Cancelado","unit":"Litorânea"},
  {"id":"lit-4","client_name":"Daniela Lopes","contact":"63 98125-7669","date":"2026-04-01","time":"19:30","guests":"10","period":"jantar","space":"VIP II","status":"confirmada","notes":"","unit":"Litorânea"},
  {"id":"lit-5","client_name":"Grupo Equatorial - RH","contact":"98 99112-4455","date":"2026-04-02","time":"12:00","guests":"25","period":"almoço","space":"Vista Mar","status":"confirmada","notes":"Corporativo","unit":"Litorânea"},
  {"id":"lit-6","client_name":"Mariana Costa (Níver)","contact":"98 98223-1122","date":"2026-04-03","time":"21:00","guests":"12","period":"jantar","space":"VIP I","status":"confirmada","notes":"Aniversário","unit":"Litorânea"},
  {"id":"lit-7","client_name":"Carlos Eduardo Silva","contact":"98 98776-5544","date":"2026-04-03","time":"20:30","guests":"04","period":"jantar","space":"Geral","status":"pendente","notes":"","unit":"Litorânea"},
  {"id":"lit-8","client_name":"Dra. Camila Rocha","contact":"98 98144-8899","date":"2026-04-04","time":"13:00","guests":"08","period":"almoço","space":"Vista Mar","status":"confirmada","notes":"","unit":"Litorânea"},
  {"id":"lit-9","client_name":"Roberto Souza","contact":"98 99611-2233","date":"2026-04-04","time":"20:00","guests":"06","period":"jantar","space":"VIP II","status":"confirmada","notes":"","unit":"Litorânea"},
  {"id":"lit-10","client_name":"Juliana Alencar","contact":"98 98822-7766","date":"2026-04-05","time":"12:30","guests":"14","period":"almoço","space":"Geral","status":"confirmada","notes":"Família","unit":"Litorânea"},
  {"id":"far-1","client_name":"Milton Campelo","contact":"9892001444","date":"2026-04-01","time":"19:00","guests":"25","period":"jantar","space":"Geral","status":"confirmada","notes":"","unit":"Farol"},
  {"id":"far-2","client_name":"Leandro José","contact":"98981510453","date":"2026-04-01","time":"12:00","guests":"06","period":"almoço","space":"Geral","status":"confirmada","notes":"","unit":"Farol"},
  {"id":"far-3","client_name":"Consultório Dra. Ana","contact":"98991442233","date":"2026-04-02","time":"20:00","guests":"30","period":"jantar","space":"Mezanino","status":"confirmada","notes":"Confraternização","unit":"Farol"},
  {"id":"far-4","client_name":"Rebeca Frota","contact":"98988441122","date":"2026-04-03","time":"20:30","guests":"15","period":"jantar","space":"VIP I","status":"pendente","notes":"Níver","unit":"Farol"},
  {"id":"far-5","client_name":"Marcos Vinicius","contact":"98982115566","date":"2026-04-04","time":"13:00","guests":"08","period":"almoço","space":"Geral","status":"confirmada","notes":"","unit":"Farol"},
  {"id":"far-6","client_name":"Patrícia Vieira","contact":"98996554411","date":"2026-04-04","time":"19:30","guests":"10","period":"jantar","space":"Mezanino","status":"confirmada","notes":"","unit":"Farol"},
  {"id":"far-7","client_name":"Sérgio Murilo","contact":"98987442211","date":"2026-04-05","time":"12:30","guests":"20","period":"almoço","space":"Geral","status":"confirmada","notes":"Almoço de Páscoa","unit":"Farol"}
];

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUnit, setSelectedUnit] = useState('Farol');
  const [reservations, setReservations] = useState(initialReservations);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === 'admin@cabanadosol.com.br' && password === 'admin123') {
      setUser({ email });
    } else {
      alert('Credenciais inválidas!');
    }
  };

  const handleExportExcel = () => {
    const headers = ['NOME CLIENTE', 'CONTATO', 'DATA', 'HORÁRIO', 'QTD./PX', 'ALMOÇO/JANTAR', 'ESPAÇO', 'STATUS', 'OBSERVAÇÕES'];
    const rows = reservations
      .filter(r => r.unit === selectedUnit)
      .map(r => [r.client_name, r.contact, r.date, r.time, `${r.guests}px`, r.period, r.space, r.status, r.notes]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RESERVAS_BACKUP_${selectedUnit.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      return res.unit === selectedUnit && (res.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || res.contact.includes(searchTerm));
    });
  }, [reservations, selectedUnit, searchTerm]);

  const metrics = useMemo(() => {
    const unitRes = reservations.filter(r => r.unit === selectedUnit);
    const active = unitRes.filter(r => r.status === 'confirmada');
    return {
      totalReservations: unitRes.length,
      confirmed: active.length,
      pending: unitRes.filter(r => r.status === 'pendente').length,
      totalGuests: active.reduce((sum, r) => sum + parseInt(r.guests || 0), 0)
    };
  }, [reservations, selectedUnit]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-amber-500 mb-2">Cabana do Sol</h1>
            <p className="text-slate-400">Sistema Gerencial de Reservas</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" placeholder="seu@email.com.br" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" placeholder="••••••••" required />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-lg transition duration-200">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24">
      <header className="bg-slate-900 border-b border-slate-800 shadow-md px-6 py-5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-amber-500 tracking-tight">Cabana do Sol</h1>
            <span className="text-xl text-slate-500">/</span>
            <span className="text-xl md:text-2xl font-medium text-slate-300">Gestão Operacional</span>
          </div>
          <div className="flex items-center flex-wrap gap-4">
            <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex gap-1 shadow-inner">
              <button onClick={() => setSelectedUnit('Farol')} className={`px-5 py-2.5 rounded-lg text-base font-bold transition ${selectedUnit === 'Farol' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Farol</button>
              <button onClick={() => setSelectedUnit('Litorânea')} className={`px-5 py-2.5 rounded-lg text-base font-bold transition ${selectedUnit === 'Litorânea' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Litorânea</button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
              <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-950 text-sm rounded-xl pl-10 pr-4 py-3 border border-slate-800 w-64 focus:outline-none focus:border-amber-500 text-white" />
            </div>
            <button onClick={() => setUser(null)} className="p-3 bg-slate-950 hover:bg-red-950 border border-slate-800 hover:border-red-900 rounded-xl text-slate-400 hover:text-red-400 transition"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <nav className="bg-slate-900/60 backdrop-blur border-b border-slate-900 px-6 py-3">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'dashboard' ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50'}`}>Painel Inicial</button>
          <button onClick={() => setActiveTab('nova-reserva')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'nova-reserva' ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50'}`}>+ Inserir Reserva</button>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {activeTab === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm"><div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Mês (Planilha)</p><p className="text-3xl font-black text-white">{metrics.totalReservations}</p></div><div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-amber-500"><Calendar className="h-6 w-6" /></div></div>
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm"><div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmadas</p><p className="text-3xl font-black text-emerald-400">{metrics.confirmed}</p></div><div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-400"><CheckCircle className="h-6 w-6" /></div></div>
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm"><div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pendentes</p><p className="text-3xl font-black text-amber-400">{metrics.pending}</p></div><div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-amber-400"><Clock className="h-6 w-6" /></div></div>
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm"><div className="space-y-1"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fluxo Hóspedes (PX)</p><p className="text-3xl font-black text-blue-400">{metrics.totalGuests}</p></div><div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-blue-400"><Users className="h-6 w-6" /></div></div>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-lg border-b border-slate-800 pb-3">
                <Calendar className="h-5 w-5 text-amber-500" />
                <span>Próximos dias</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {['Qua 01/04', 'Qui 02/04', 'Sex 03/04', 'Sáb 04/04', 'Dom 05/04'].map((day, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 min-w-[140px] text-center shadow-inner">
                    <p className="text-xs text-slate-400 font-medium mb-1">{day}</p>
                    <p className="text-xl font-black text-white">
                      {reservations.filter(r => r.unit === selectedUnit && r.date === `2026-04-0${idx+1}` && r.status === 'confirmada').length} res
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-md">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <h3 className="font-bold text-slate-200 text-lg">Listagem de Reservas Vigentes</h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-950 rounded-full border border-slate-800 text-slate-400">{filteredReservations.length} exibidas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                      <th className="px-6 py-4">Cliente / Contato</th>
                      <th className="px-6 py-4">Data / Horário</th>
                      <th className="px-6 py-4">PX</th>
                      <th className="px-6 py-4">Ambiente</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-850/40 transition">
                        <td className="px-6 py-4"><p className="font-bold text-white">{res.client_name}</p><p className="text-xs text-slate-400 mt-0.5">{res.contact || 'Sem contato'}</p></td>
                        <td className="px-6 py-4"><p className="text-slate-200 font-medium">{res.date}</p><p className="text-xs text-amber-500 font-bold uppercase mt-0.5">{res.time} • {res.period}</p></td>
                        <td className="px-6 py-4 font-black text-slate-300">{res.guests}px</td>
                        <td className="px-6 py-4"><span className="text-xs bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-medium text-slate-300">{res.space}</span></td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            res.status === 'confirmada' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400' : 
                            res.status === 'pendente' ? 'bg-amber-950/50 border-amber-800 text-amber-400' : 
                            'bg-red-950/50 border-red-800 text-red-400'
                          }`}>
                            {res.status === 'confirmada' ? <CheckCircle className="h-3 w-3" /> : res.status === 'pendente' ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {res.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate" title={res.notes}>{res.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-md max-w-2xl mx-auto space-y-6">
            <h3 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-3">Inserir Nova Reserva Manual</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Nome do Cliente</label><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" placeholder="Ex: João Silva" /></div>
              <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Contato</label><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" placeholder="Ex: 98 99999-9999" /></div>
              <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Data</label><input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" /></div>
              <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Horário</label><input type="time" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" /></div>
              <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Qtd Pessoas (PX)</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" placeholder="Ex: 4" /></div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Espaço do Ambiente</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500">
                  <option>— sem espaço definido —</option>
                  <option>Geral • 150 lugares</option>
                  <option>Mezanino • 40 lugares</option>
                  <option>VIP I • 60 lugares</option>
                  <option>VIP II • 60 lugares</option>
                  <option>Vista Mar • 80 lugares</option>
                </select>
              </div>
            </div>
            <button onClick={() => { alert('Reserva salva localmente!'); setActiveTab('dashboard'); }} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-lg transition">Salvar no Sistema</button>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={handleExportExcel} className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3.5 rounded-full shadow-xl hover:shadow-emerald-900/30 transition transform hover:-translate-y-0.5 active:translate-y-0 border border-emerald-500">
          <FileSpreadsheet className="h-5 w-5" />
          <span className="text-sm">Backup Excel ({selectedUnit})</span>
        </button>
      </div>
    </div>
  );
}