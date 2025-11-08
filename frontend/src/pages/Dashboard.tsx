// src/pages/Dashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { Card } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Skeleton } from '../components/Skeleton'
type Serie = { mes: string; importe: number }
// helpers locales
const ellipsis = (s: string, max = 18) => (s.length > max ? s.slice(0, max - 1) + '…' : s)
const fmtARS = (v:number) => v.toLocaleString('es-AR', { style:'currency', currency:'ARS' })

const Col = {
  A: '#60a5fa',
  B: '#34d399',
  C: '#fbbf24',
  D: '#f87171',
} as const;

type TopPagador = { cliente_id:number; importe:number }
type TopCliente = { cliente:string; importe:number }
type ResumenPT = { cliente_id:number; cliente:string; pagadas:number; a_tiempo:number; ratio:number }

export default function Dashboard(){
  const qMes  = useQuery({ queryKey:['kpi-mes'],  queryFn: async()=> (await api.get<Serie[]>('/reportes/ingresos-por-mes/')).data })
  const qTop  = useQuery({
  queryKey:['kpi-top-pagos'],
  queryFn: async()=> (await api.get<TopPagador[]>('/reportes/top-clientes-pagos/')).data
  })
  const qCart = useQuery({ queryKey:['kpi-cart'], queryFn: async()=> (await api.get<Record<string,number>>('/reportes/estado-cartera/')).data })

  // NUEVO: KPIs pagos a tiempo
  const qPTRes = useQuery({ queryKey:['rep-pt-resumen'], queryFn: async()=> (await api.get<ResumenPT[]>('/reportes/pagos-tiempo/resumen/')).data })
  const qPTTop = useQuery({ queryKey:['rep-pt-top'],     queryFn: async()=> (await api.get<ResumenPT[]>('/reportes/pagos-tiempo/top/?n=5')).data })
  // Traemos nombres de clientes para mapear cliente_id → razón social
    type ClienteLite = { id:number; razon_social:string }
    const qClientes = useQuery({
      queryKey:['clientes-all-lite'],
      queryFn: async()=> (await api.get<ClienteLite[]>('/clientes/?ordering=razon_social')).data
    })

    // Mapa id → nombre
    const cliMap = new Map<number, string>((qClientes.data||[]).map(c => [c.id, c.razon_social]))

  const onTimeGlobal = (()=> {
    if(!qPTRes.data) return '—'
    const pagadas = qPTRes.data.reduce((a,b)=> a + b.pagadas, 0)
    const enTiempo = qPTRes.data.reduce((a,b)=> a + b.a_tiempo, 0)
    return pagadas ? `${(100*enTiempo/pagadas).toFixed(1)}%` : '0.0%'
  })()

  return (
    <div className="grid2">
      {/* Ingresos por mes */}
      <Card title="Ingresos por mes (últimos 12)">
        <div style={{height:280}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={qMes.data||[]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tickFormatter={(v)=> new Date(v).toLocaleDateString('es-AR',{month:'short'})} />
              <YAxis />
              <Tooltip formatter={(v:number)=> v.toLocaleString('es-AR',{style:'currency',currency:'ARS'})} />
              <Bar dataKey="importe" fill={Col.A} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top clientes por pagos (sumatoria)">
        <div style={{height:360}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={(qTop.data||[])
                .map(d => ({
                  id: d.cliente_id,
                  name: cliMap.get(d.cliente_id) || `Cliente #${d.cliente_id}`,
                  label: ellipsis(cliMap.get(d.cliente_id) || `Cliente #${d.cliente_id}`, 22),
                  importe: d.importe
                }))
                .sort((a,b)=> b.importe - a.importe)}
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              {/* Eje X: valores (monto) */}
              <XAxis type="number" tickFormatter={(v:number)=> v.toLocaleString('es-AR')} />
              {/* Eje Y: nombres truncados */}
              <YAxis
                dataKey="label"
                type="category"
                width={50}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(v:number, _key, payload:any) => [fmtARS(v), payload?.payload?.name]}
                labelFormatter={(label:any)=> `Cliente: ${label}`}
              />
              <Bar dataKey="importe" fill={Col.B} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {qClientes.isLoading && <div style={{marginTop:8, color:'var(--muted)'}}>Cargando nombres de clientes…</div>}
      </Card>


      {/* Estado de cartera */}
      <Card title="Estado de cartera">
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="value" data={Object.entries(qCart.data||{}).map(([k,v])=>({name:k,value:v}))} outerRadius={80}>
                {Object.entries(qCart.data||{}).map((_,i)=> <Cell key={i} fill={[Col.A,Col.B,Col.C,Col.D][i%4]} />)}
              </Pie>
              <Tooltip formatter={(v:number)=> v.toLocaleString('es-AR',{style:'currency',currency:'ARS'})} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* NUEVO: On-time rate (global) */}
      <Card title="On-time rate (global)">
        <h2 style={{fontSize:36, margin:0}}>{qPTRes.isLoading ? 'Cargando…' : onTimeGlobal}</h2>
        <div style={{color:'var(--muted)', marginTop:6}}>Porcentaje de facturas pagadas en o antes del vencimiento</div>
      </Card>

      {/* NUEVO: Top clientes puntuales */}
      <Card title="Top clientes puntuales (pagos a tiempo)">
        {qPTTop.isLoading ? <Skeleton rows={3}/> : (
          <table className="table">
            <thead><tr><th>Cliente</th><th>En tiempo</th><th>Pagadas</th><th>%</th></tr></thead>
            <tbody>
              {qPTTop.data?.map(r=>(
                <tr key={r.cliente_id}>
                  <td>{r.cliente}</td>
                  <td>{r.a_tiempo}</td>
                  <td>{r.pagadas}</td>
                  <td>{(r.ratio*100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
