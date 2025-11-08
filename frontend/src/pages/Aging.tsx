import { useQuery } from '@tanstack/react-query'
import type { AgingDict } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card } from '../components/UI'
import { Skeleton } from '../components/Skeleton'
import { api } from '../api'

export default function Aging(){
const { data, isLoading, isError } = useQuery({ queryKey:['aging'], queryFn: async ()=> (await api.get<AgingDict>('/reportes/aging/')).data })
if (isLoading) return <Skeleton rows={6} />
if (isError || !data) return <div className="alert error">Error al cargar el aging.</div>

const rows = Object.entries(data).map(([rango, monto])=>({ rango, monto }))
return (
<Card title="Aging de cobranzas">
<div className="cards">
{rows.map(r => (
<div className="card" key={r.rango}>
<div className="card-title">{r.rango} días</div>
<div className="card-value">${r.monto.toLocaleString('es-AR')}</div>
</div>
))}
</div>
<div className="chart">
<ResponsiveContainer width="100%" height={300}>
<BarChart data={rows}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="rango"/>
<YAxis />
<Tooltip formatter={(v:number)=> v.toLocaleString('es-AR',{style:'currency',currency:'ARS'})} />
<Bar dataKey="monto" />
</BarChart>
</ResponsiveContainer>
</div>
</Card>
)
}

