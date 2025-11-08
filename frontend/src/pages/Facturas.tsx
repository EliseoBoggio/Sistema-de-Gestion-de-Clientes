import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, API_BASE } from '../api'
import type { Factura } from '../types'
import { Card, Toolbar } from '../components/UI'
import { StatusPill } from '../components/StatusPill'
import { Skeleton } from '../components/Skeleton'

export default function Facturas(){
const [search, setSearch] = useState('')
const q = useQuery({ queryKey:['facturas', search], queryFn: async()=> (await api.get<Factura[]>(`/facturas/${search?`?search=${search}`:''}`)).data })
return (
<Card title="Facturas" action={<Toolbar>
<input placeholder="Buscar por Nro o Cliente" value={search} onChange={e=>setSearch(e.target.value)} />
</Toolbar>}>
{q.isLoading ? <Skeleton rows={6}/> : (
<table className="table">
<thead><tr><th>Nro</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th><th>Estado</th><th>Total</th><th></th></tr></thead>
<tbody>
{q.data?.map(f=> (
<tr key={f.id}>
<td>{f.nro}</td>
<td>{f.cliente}</td>
<td>{new Date(f.fecha).toLocaleDateString()}</td>
<td>{new Date(f.vencimiento).toLocaleDateString()}</td>
<td><StatusPill value={f.estado}/></td>
<td>${f.total.toLocaleString('es-AR')}</td>
<td className="actions">
<a className="btn ghost" href={`${API_BASE}/facturas/${f.id}/pdf/`} target="_blank">PDF</a>
</td>
</tr>
))}
</tbody>
</table>
)}
</Card>
)
}