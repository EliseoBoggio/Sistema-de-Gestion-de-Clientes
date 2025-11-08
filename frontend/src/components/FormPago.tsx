import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { Modal, Button } from './UI'

type FacturaLite = { id:number; nro:string; estado:string; total:number }

function num(v:any){ return parseFloat(String(v).replace(',','.')) || 0 }

export default function FormPago({
  clienteId, open, onClose, onSaved
}:{ clienteId:number; open:boolean; onClose:()=>void; onSaved:()=>void }){
  const [facturaId, setFacturaId] = useState<number|''>('')
  const [monto, setMonto]         = useState<any>('')
  const [fecha, setFecha]         = useState<string>(new Date().toISOString().slice(0,10))
  const [medio, setMedio]         = useState<string>('TRANSFERENCIA')
  
  useEffect(()=>{ if(!open){ setFacturaId(''); setMonto(''); setFecha(new Date().toISOString().slice(0,10)); setMedio('TRANSFERENCIA') }},[open])

  const qFac = useQuery({
    queryKey:['facturas-open', clienteId],
    queryFn: async()=>{
      // si tenés endpoint específico por cliente, mejor: /clientes/{id}/facturas-abiertas/
      const all = (await api.get<FacturaLite[]>('/facturas/?ordering=-fecha')).data
      return all.filter(f=> f.estado==='ABIERTA' || f.estado==='PARCIAL')
    }
  })

const [errors, setErrors] = useState<string[]>([])
const m = useMutation({
  mutationFn: async ()=>{
    const errs:string[]=[]
    if(!facturaId) errs.push('Seleccioná una factura.')
    if(!num(monto)) errs.push('Ingresá un monto válido.')
    if(!fecha) errs.push('Fecha requerida.')
    if(errs.length){ setErrors(errs); throw new Error('Validación'); }
    const payload = { factura: facturaId, monto: num(monto), fecha, medio }
    return (await api.post('/pagos/', payload)).data
  },
  onSuccess: ()=>{
    setErrors([])
    onSaved()
  }
})


  if(!open) return null
  return (
    <Modal open={open} onClose={onClose} title="Registrar pago">
      <div className="grid2">
        <label>Factura
          <select value={facturaId} onChange={e=>setFacturaId(Number(e.target.value)||'')}>
            <option value="">Seleccionar…</option>
            {qFac.data?.map(f=> <option key={f.id} value={f.id}>{f.nro} — {f.estado} — ${f.total.toLocaleString('es-AR')}</option>)}
          </select>
        </label>
        <label>Monto
          <input type="text" inputMode="decimal" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0,00" />
        </label>
        <label>Fecha
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
        </label>
        <label>Medio
          <input value={medio} onChange={e=>setMedio(e.target.value)} placeholder="TRANSFERENCIA / TARJETA / EFECTIVO" />
        </label>
      </div>

      <div className="row" style={{marginTop:12}}>
        <div className="spacer"/>
                {errors.length>0 && (
          <div className="alert error">
            <ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
          </div>
        )}

        <Button kind="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={!facturaId || !num(monto)} onClick={()=>m.mutate()}>{m.isPending?'Guardando…':'Guardar'}</Button>
      </div>
    </Modal>
  )
}
