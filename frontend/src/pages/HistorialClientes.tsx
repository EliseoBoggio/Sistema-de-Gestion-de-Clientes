import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { Card, Button } from '../components/UI'
import { Skeleton } from '../components/Skeleton'
import { useNavigate } from 'react-router-dom'

type HistItem = {
  id: number
  fecha: string
  tipo: string
  nota?: string | null
  cliente: number
  cliente_razon_social: string
}

export default function HistorialClientes(){
  const nav = useNavigate()
  const q = useQuery({
    queryKey: ['clientes-historial-page'],
    queryFn: async ()=>{
      const { data } = await api.get<HistItem[]>(
        '/clientes/historial-global/?limit=100&tipos=ALTA_CLIENTE,DESACTIVACION_CLIENTE,ACTIVACION_CLIENTE'
      )
      return data
    }
  })

  return (
    <Card
      title="Historial de clientes"
      action={<Button kind="ghost" onClick={()=>nav('/clientes')}>← Volver a Clientes</Button>}
    >
      {q.isLoading && <Skeleton rows={8} />}
      {q.isError && <p>Error al cargar historial.</p>}
      {!q.isLoading && q.data && (
        <table className="table">
          <thead>
            <tr><th>Fecha</th><th>Tipo</th><th>Cliente</th><th>Detalle</th></tr>
          </thead>
          <tbody>
          {q.data.map(it=>(
            <tr key={it.id}>
              <td>{new Date(it.fecha).toLocaleString('es-AR')}</td>
              <td>
                <span className="pill" style={{
                  backgroundColor:
                    it.tipo==='ALTA_CLIENTE'          ? '#34d399' :
                    it.tipo==='DESACTIVACION_CLIENTE' ? '#f87171' :
                    it.tipo==='ACTIVACION_CLIENTE'    ? '#60a5fa' :
                    it.tipo==='EDIT_CLIENTE'          ? '#fbbf24' : '#a78bfa',
                  color:'#0b0f16'
                }}>
                  {it.tipo.replace('_CLIENTE','')}
                </span>
              </td>
              <td>#{it.cliente} – {it.cliente_razon_social}</td>
              <td>{it.nota || '—'}</td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
