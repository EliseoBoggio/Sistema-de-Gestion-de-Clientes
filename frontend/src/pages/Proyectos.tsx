import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { Proyecto, Cliente } from '../types'
import { Card, Toolbar, Button } from '../components/UI'
import FormProyecto from '../components/FormProyecto'
import { StatusPill } from '../components/StatusPill'
import { Skeleton } from '../components/Skeleton'

export default function Proyectos(){
const qc = useQueryClient()
const [search, setSearch] = useState('')
const [open, setOpen] = useState(false)


const q = useQuery({ queryKey:['proyectos', search], queryFn: async()=> (await api.get<Proyecto[]>(`/proyectos/${search?`?search=${encodeURIComponent(search)}`:''}`)).data })
const qcClientes = useQuery({ queryKey:['clientes-all'], queryFn: async()=> (await api.get<Cliente[]>('/clientes/')).data })


const clienteName = (id:number)=> qcClientes.data?.find(c=>c.id===id)?.razon_social || `#${id}`


return (
<Card title="Proyectos" action={<Toolbar>
<input placeholder="Buscar proyecto o cliente" value={search} onChange={e=>setSearch(e.target.value)} />
<Button kind='ghost' onClick={()=>{ /* solo re-render */ }}>Buscar</Button>
<Button onClick={()=>setOpen(true)}>Nuevo</Button>
</Toolbar>}>
{q.isLoading ? <Skeleton rows={6}/> : (
<table className="table">
<thead><tr><th>Nombre</th><th>Cliente</th><th>Estado</th><th>Inicio</th></tr></thead>
<tbody>
{q.data?.map(p=> (
<tr key={p.id}>
<td>{p.nombre}</td>
<td>{clienteName(p.cliente)}</td>
<td><StatusPill value={p.estado}/></td>
<td>{p.fecha_inicio? new Date(p.fecha_inicio).toLocaleDateString():'-'}</td>
</tr>
))}
</tbody>
</table>
)}


<FormProyecto
open={open}
onClose={()=>setOpen(false)}
onSaved={()=>{ setOpen(false); qc.invalidateQueries({queryKey:['proyectos']}) }}
/>
</Card>
)}