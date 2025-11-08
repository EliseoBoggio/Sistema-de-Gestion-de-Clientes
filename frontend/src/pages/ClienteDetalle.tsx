import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, API_BASE } from '../api'
import type { Cliente, Proyecto, Factura, Historial } from '../types'
import { Button, Card } from '../components/UI'
import FormPago from '../components/FormPago'
import { useState } from 'react'
import FormProyecto from '../components/FormProyecto'
import { Skeleton } from '../components/Skeleton'
import FormFactura from '../components/FormFactura'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '../components/Toast'

export default function ClienteDetalle(){
const { id } = useParams(); const cliId = Number(id)
const qc = useQueryClient()
const [tab, setTab] = useState<'datos'|'proyectos'|'facturas'|'historial'>('datos')
const [showFactura, setShowFactura] = useState(false)
const [showPago, setShowPago] = useState<null | { facturaId?: number }>(null)
const toast = useToast()
const [projDialog, setProjDialog] = useState<null | { mode:'new'|'edit', proyecto?: Proyecto }>(null)

const delProyecto = useMutation({
  mutationFn: async (id: number) => (await api.delete(`/proyectos/${id}/`)).data,

  // Optimistic update
  onMutate: async (id: number) => {
    await qc.cancelQueries({ queryKey: ['cliente', cliId, 'proyectos'] })
    const key = ['cliente', cliId, 'proyectos'] as const
    const prev = qc.getQueryData<Proyecto[]>(key)

    if (prev) {
      qc.setQueryData<Proyecto[]>(key, prev.filter(p => p.id !== id))
    }

    // Aviso “en proceso”
    toast.info('Eliminando proyecto…', 1500)

    return { prev, key }
  },

  onError: (err: any, _id, ctx) => {
    if (ctx?.prev) qc.setQueryData(ctx.key!, ctx.prev) // rollback
    const msg = err?.response?.data?.detail || 'No se pudo eliminar el proyecto'
    toast.error(msg)
  },

  onSuccess: () => {
    toast.success('Proyecto eliminado ✅')
  },

  onSettled: () => {
    qc.invalidateQueries({ queryKey: ['cliente', cliId, 'proyectos'] })
  },
})

const setEstadoProyecto = useMutation({
  mutationFn: async ({ id, estado }: { id:number; estado:'EN_PROCESO'|'PAUSADO'|'FINALIZADO' }) =>
    (await api.patch(`/proyectos/${id}/`, { estado })).data,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['cliente', cliId, 'proyectos'] })
  }
})

const qCliente = useQuery({ queryKey:['cliente', cliId], queryFn: async()=> (await api.get<Cliente>(`/clientes/${cliId}/`)).data })
const qProyectos = useQuery({ queryKey:['cliente', cliId, 'proyectos'], queryFn: async()=> (await api.get<Proyecto[]>(`/clientes/${cliId}/proyectos/`)).data })
const qFacturas = useQuery({ queryKey:['cliente', cliId, 'facturas'], queryFn: async()=> (await api.get<Factura[]>(`/facturas/`)).data })
const qHistorial = useQuery({ queryKey:['cliente', cliId, 'historial'], queryFn: async()=> (await api.get<Historial[]>(`/clientes/${cliId}/historial/`)).data })

if (qCliente.isLoading) return <Skeleton rows={5} />
if (qCliente.isError || !qCliente.data) return <p>No se pudo cargar el cliente.</p>



const c = qCliente.data
const facturasCli = (qFacturas.data||[]).filter(f=> f.cliente===cliId)


return (
<div className="stack">
<div className="tabs">
{(['datos','proyectos','facturas','historial'] as const).map(t=> (
<button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t.toUpperCase()}</button>
))}
<div className="spacer"/>
{tab==='facturas' && <Button onClick={()=>setShowFactura(true)}>Nueva Factura</Button>}
</div>


{tab==='datos' && (
<Card title={c.razon_social}>
<p><b>CUIT:</b> {c.cuit || '-'}</p>
<p><b>Email:</b> {c.email || '-'}</p>
<p><b>Telefono:</b> {c.telefono || '-'}</p>
<p><b>Estado:</b> <span className={`pill ${c.estado==='ACTIVO'?'ok':'warn'}`}>{c.estado}</span></p>
</Card>
)}


{tab==='proyectos' && (
  <Card
    title="Proyectos"
    action={<Button onClick={()=>setProjDialog({mode:'new'})}>Nuevo proyecto</Button>}
  >
    {qProyectos.isLoading ? <p>Cargando…</p> : (
      <>
        {qProyectos.data && qProyectos.data.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Inicio</th>
                <th>Fin previsto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {qProyectos.data.map(p=>(
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td><span className="pill">{p.estado}</span></td>
                <td>{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : '-'}</td>
                <td>{p.fecha_fin_prev ? new Date(p.fecha_fin_prev).toLocaleDateString() : '-'}</td>
                <td className="actions">
                  <Button kind="ghost" onClick={()=>setProjDialog({mode:'edit', proyecto:p})}>Editar</Button>

                  <Button
                    kind="warn"
                    onClick={async ()=>{ await setEstadoProyecto.mutateAsync({ id:p.id, estado:'PAUSADO' }) }}
                    disabled={p.estado === 'PAUSADO'}
                  >
                    Pausar
                  </Button>

                  <Button
                    kind="success"
                    onClick={async ()=>{ await setEstadoProyecto.mutateAsync({ id:p.id, estado:'FINALIZADO' }) }}
                    disabled={p.estado === 'FINALIZADO'}
                  >
                    Finalizar
                  </Button>

                   <Button
                      className="icon"
                      kind="danger"
                      title="Eliminar"
                      aria-label="Eliminar proyecto"
                      disabled={delProyecto.isPending}                 // ← deshabilita mientras borra
                      onClick={async () => {
                        if (confirm(`¿Eliminar proyecto "${p.nombre}"?`)) {
                          await delProyecto.mutateAsync(p.id)
                        }
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', opacity: delProyecto.isPending ? 0.6 : 1 }}>
                        <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM6 9h2v8H6V9Zm-1 10h14v2H5v-2Z"/>
                      </svg>
                    </Button>
                </td>

              </tr>
            ))}
            </tbody>
          </table>
        ) : (
          <p>(sin proyectos)</p>
        )}
      </>
    )}
  </Card>
)}



{tab==='facturas' && (
<Card title="Facturas">
{qFacturas.isLoading ? <p>Cargando…</p> : (
<table className="table">
<thead><tr><th>Nro</th><th>Fecha</th><th>Vencimiento</th><th>Estado</th><th>Total</th><th></th></tr></thead>
<tbody>
{facturasCli.map(f=> (
<tr key={f.id}>
<td>{f.nro}</td>
<td>{new Date(f.fecha).toLocaleDateString()}</td>
<td>{new Date(f.vencimiento).toLocaleDateString()}</td>
<td><span className="pill">{f.estado}</span></td>
<td>${f.total.toLocaleString('es-AR')}</td>
<td className="actions">
<a className="btn ghost" href={`${API_BASE}/facturas/${f.id}/pdf/`} target="_blank">PDF</a>
<Button kind='ghost' onClick={()=>setShowPago({ facturaId: f.id })}>Registrar pago</Button>
<Button
  kind='primary'
  onClick={async ()=>{
    try {
      await api.post(`/facturas/${f.id}/enviar/`)
      toast.success('Factura enviada por email ✅')
    } catch (e:any){
      const msg = e?.response?.data?.error ?? 'No se pudo enviar el email'
      toast.error(`Error: ${msg}`)
    }
  }}
>
  Enviar por mail
</Button>

</td>
</tr>
))}
</tbody>
</table>
)}
</Card>
)}


{tab==='historial' && (
<Card title="Registros">
{qHistorial.isLoading ? <p>Cargando…</p> : (
<ul>
{qHistorial.data?.map(h=> (
<li key={h.id}>{new Date(h.fecha).toLocaleString()} — <b>{h.tipo}</b> — {h.nota}</li>
))}
{qHistorial.data?.length===0 && <li>(sin movimientos)</li>}
</ul>
)}
</Card>
)}

<FormFactura
  clienteId={cliId}
  open={showFactura}
  onClose={()=>setShowFactura(false)}
  onSaved={()=>{
    setShowFactura(false)
    qc.invalidateQueries({ queryKey:['cliente', cliId, 'facturas'] })
  }}
/>
<FormPago clienteId={cliId} onClose={()=>setShowPago(null)} onSaved={()=>{
  setShowPago(null);
  qc.invalidateQueries({ queryKey:['cliente', cliId, 'facturas'] });
}} open={!!showPago}/>
<FormProyecto
  open={!!projDialog}
  mode={projDialog?.mode || 'new'}
  initial={projDialog?.proyecto || null}
  fixedClienteId={cliId}
  onClose={()=>setProjDialog(null)}
  onSaved={()=>{ setProjDialog(null); qc.invalidateQueries({queryKey:['cliente', cliId, 'proyectos']}) }}
/>

</div>
)
}