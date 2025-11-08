import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Cliente } from '../types'
import { Button, Card, Toolbar, Modal } from '../components/UI'
import FormCliente from '../components/FormCliente'
import { Skeleton } from '../components/Skeleton'


type HistItem = {
  id: number
  fecha: string
  tipo: string
  nota?: string | null
  cliente: number
  cliente_razon_social: string
  usuario?: number | null
}

export default function Clientes(){
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState<null | {mode:'new'|'edit', cliente?: Cliente}>(null)

  // NUEVO: estado para confirmación de borrado
  const [confirmDel, setConfirmDel] = useState<null | {id:number, nombre:string}>(null)
  const [deleteError, setDeleteError] = useState<string|null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clientes', search],
    queryFn: async ()=>{
      const qs = search ? `?search=${encodeURIComponent(search)}` : ''
      const { data } = await api.get<Cliente[]>(`/clientes/${qs}`)
      return data
    }
  })
  const hq = useQuery({
  queryKey: ['clientes-historial'],
  queryFn: async ()=>{
    const { data } = await api.get<HistItem[]>('/clientes/historial-global/?limit=50&tipos=ALTA_CLIENTE,DESACTIVACION_CLIENTE,ACTIVACION_CLIENTE')
    return data
    }
  })
  const desactivar = useMutation({
    mutationFn: async (id:number)=> (await api.post(`/clientes/${id}/desactivar/`)).data,
    onMutate: async (id:number)=>{
      await qc.cancelQueries({queryKey:['clientes']})
      qc.invalidateQueries({ queryKey: ['clientes-historial'] })
      const key = ['clientes', search]
      const prev = qc.getQueryData<Cliente[]>(key)
      if (prev){
        const next = prev.map(c => c.id===id ? {...c, estado:'INACTIVO'} : c)
        qc.setQueryData(key, next)
      }
      return { prev }
    },
    onError: (_err, _id, ctx)=>{
      if (ctx?.prev) qc.setQueryData(['clientes', search], ctx.prev)
    },
    onSettled: ()=>{
      qc.invalidateQueries({queryKey:['clientes']})
    }
  })

  const activar = useMutation({
    mutationFn: async (id:number)=> (await api.post(`/clientes/${id}/activar/`)).data,
    onMutate: async (id:number)=>{
      await qc.cancelQueries({queryKey:['clientes']})
      qc.invalidateQueries({ queryKey: ['clientes-historial'] })
      const key = ['clientes', search]
      const prev = qc.getQueryData<Cliente[]>(key)
      if (prev){
        const next = prev.map(c => c.id===id ? {...c, estado:'ACTIVO'} : c)
        qc.setQueryData(key, next)
      }
      return { prev }
    },
    onError: (_err, _id, ctx)=>{
      if (ctx?.prev) qc.setQueryData(['clientes', search], ctx.prev)
    },
    onSettled: ()=>{
      qc.invalidateQueries({queryKey:['clientes']})
    }
  })

  // NUEVO: mutación de eliminación con optimismo y rollback
  const delCliente = useMutation({
  mutationFn: async (id:number) => { await api.delete(`/clientes/${id}/`) },
  onMutate: async (id:number)=>{
    setDeleteError(null)
    await qc.cancelQueries({queryKey:['clientes']})
    const key = ['clientes', search]
    const prev = qc.getQueryData<Cliente[]>(key)
    if(prev) qc.setQueryData(key, prev.filter(c => c.id !== id)) // optimista
    return { prev }
  },
  onError: (err:any, _id, ctx)=>{
    if(ctx?.prev) qc.setQueryData(['clientes', search], ctx.prev) // rollback
    const detail = err?.response?.data?.detail
    setDeleteError(detail || 'No se pudo eliminar el cliente.')
  },
  onSuccess: ()=>{
    setConfirmDel(null)                 // ← cierra el pop-out al terminar OK
  },
  onSettled: ()=>{
    qc.invalidateQueries({queryKey:['clientes']})
  }
})


  return (
    <Card title="Clientes" action={
      <Toolbar>
        <input placeholder="Buscar razón social o CUIT" value={search} onChange={e=>setSearch(e.target.value)} />
        <Button kind='ghost' onClick={()=>refetch()}>Buscar</Button>
        <Button onClick={()=>setShowForm({mode:'new'})}>Nuevo</Button>
        <Button kind='ghost' onClick={()=>window.location.assign('/clientes/historial')}>
    Ver historial
    </Button>
      </Toolbar>
      
    }>

      {isLoading && <Skeleton rows={6} />}
      {isError && <p>Error al cargar clientes.</p>}

      {!isLoading && data && (
        <table className="table">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>CUIT</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th style={{width:220}}></th>
            </tr>
          </thead>
          <tbody>
            {data.map(c=> (
              <tr key={c.id}>
                <td><Link to={`/cliente/${c.id}`}>{c.razon_social}</Link></td>
                <td>{c.cuit || '-'}</td>
                <td>{c.email || '-'}</td>
                <td>{c.telefono || '-'}</td>
                <td><span className={`pill ${c.estado==='ACTIVO'?'ok':'warn'}`}>{c.estado}</span></td>
                <td className="actions">
                  <Button kind='ghost' onClick={()=>setShowForm({mode:'edit', cliente:c})}>Editar</Button>

                  {c.estado==='ACTIVO' ? (
                    <>
                      <Button kind='warn' onClick={()=>desactivar.mutate(c.id)}>Desactivar</Button>
                      <Button
                        className="icon"            // ← usa el padding compacto
                        kind='danger'
                        title="Eliminar"
                        aria-label="Eliminar cliente"
                        onClick={()=>{ setDeleteError(null); setConfirmDel({id:c.id, nombre:c.razon_social}) }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{verticalAlign:'middle'}}>
                          <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM6 9h2v8H6V9Zm-1 10h14v2H5v-2Z"/>
                        </svg>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={()=>activar.mutate(c.id)}>Activar</Button>
                      <Button
                        className="icon"
                        kind='danger'
                        title="Eliminar"
                        aria-label="Eliminar cliente"
                        onClick={()=>{ setDeleteError(null); setConfirmDel({id:c.id, nombre:c.razon_social}) }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{verticalAlign:'middle'}}>
                          <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM6 9h2v8H6V9Zm-1 10h14v2H5v-2Z"/>
                        </svg>
                      </Button>
                    </>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <FormCliente
          mode={showForm.mode}
          initial={showForm.cliente}
          onClose={()=>setShowForm(null)}
          onSaved={()=>{
            setShowForm(null)
            setSearch('') // evita que el filtro oculte el cliente recién creado
            qc.invalidateQueries({ queryKey: ['clientes'] })
          }}
        />
      )}

      {/* NUEVO: modal de confirmación de borrado */}
      {confirmDel && (
        <Modal open onClose={()=>setConfirmDel(null)} title="Confirmar eliminación">
          <p>¿Seguro que querés eliminar al cliente <b>{confirmDel.nombre}</b>? Esta acción no se puede deshacer.</p>

          {deleteError && <div className="alert error" style={{marginTop:8}}>{deleteError}</div>}

          <div className="row" style={{marginTop:12}}>
            <div className="spacer"/>
            <Button kind="ghost" onClick={()=>setConfirmDel(null)}>Cancelar</Button>
            <Button
              kind="danger"
              onClick={async ()=> { await delCliente.mutateAsync(confirmDel!.id) }}
              disabled={delCliente.isPending}
            >
              {delCliente.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  )
}

