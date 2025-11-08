// src/components/FormFactura.tsx
import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api'
import { Modal, Button } from './UI'

type Item = { descripcion:string; qty:number; precio_unit:number; impuesto:number }
type ProyectoOpt = { id:number; nombre:string }

// Helpers
function validarItems(items: Item[]){
  const errores: string[] = []
  if(items.length===0) errores.push('Agregá al menos un ítem.')
  items.forEach((it, i)=>{
    if(!it.descripcion?.trim()) errores.push(`Ítem #${i+1}: descripción requerida.`)
    if(!(Number(it.qty)>0)) errores.push(`Ítem #${i+1}: cantidad > 0.`)
    if(!(Number(it.precio_unit)>=0)) errores.push(`Ítem #${i+1}: precio unitario ≥ 0.`)
    if(!(Number(it.impuesto)>=0 && Number(it.impuesto)<=100)) errores.push(`Ítem #${i+1}: impuesto entre 0 y 100.`)
  })
  return errores
}
function validarCabecera(nro:string, fecha:string, venc:string){
  const errs:string[]=[]
  if(!nro.trim()) errs.push('Número de factura requerido.')
  if(!fecha) errs.push('Fecha requerida.')
  if(!venc) errs.push('Vencimiento requerido.')
  if(fecha && venc && new Date(venc) < new Date(fecha)) errs.push('Vencimiento no puede ser anterior a la fecha.')
  return errs
}
function num(v:any){
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const n = parseFloat(String(v).replace(',','.'))
  return isFinite(n) ? n : 0
}

export default function FormFactura({
  clienteId, proyectoId, open, onClose, onSaved
}:{
  clienteId:number
  proyectoId?:number
  open:boolean
  onClose:()=>void
  onSaved:()=>void
}){
  // Cabecera
  const [nro, setNro] = useState('')
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0,10))
  const [venc, setVenc]   = useState<string>(new Date(Date.now()+1000*60*60*24*30).toISOString().slice(0,10))
  const [moneda, setMoneda] = useState('ARS')

  // Proyectos del cliente
  const [proyectos, setProyectos] = useState<ProyectoOpt[]>([])
  const [proyectoSel, setProyectoSel] = useState<number | null>(proyectoId ?? null)

  useEffect(()=>{
    let cancel = false
    async function fetchProyectos(){
      try{
        if (!clienteId){ setProyectos([]); setProyectoSel(null); return }
        const { data } = await api.get<ProyectoOpt[]>(`/clientes/${clienteId}/proyectos/`)
        if (!cancel){
          setProyectos(data || [])
          if (proyectoSel && !(data||[]).some(p=>p.id===proyectoSel)) setProyectoSel(null)
        }
      }catch(_e){
        if (!cancel){ setProyectos([]); setProyectoSel(null) }
      }
    }
    fetchProyectos()
    return ()=>{ cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  // Ítems
  const [items, setItems] = useState<Item[]>([{ descripcion:'', qty:1, precio_unit:0, impuesto:0 }])
  useEffect(()=>{ if(!open){ setItems([{ descripcion:'', qty:1, precio_unit:0, impuesto:0 }]) }},[open])

  const setItem = (i:number, patch:Partial<Item>) =>
    setItems(prev => prev.map((it,idx)=> idx===i ? {...it, ...patch} : it))
  const addItem = ()=> setItems(prev => [...prev, { descripcion:'', qty:1, precio_unit:0, impuesto:0 }])
  const removeItem = (i:number)=> setItems(prev => prev.filter((_,idx)=> idx!==i))

  const filas = items.map(it=>{
    const qty = num(it.qty), pu = num(it.precio_unit), imp = num(it.impuesto)
    const base = qty * pu
    const iva  = base * (imp/100)
    return { ...it, qty, precio_unit:pu, impuesto:imp, subtotal: base + iva }
  })
  const total = useMemo(()=> filas.reduce((a,b)=> a + b.subtotal, 0), [filas])

  // Errores UI
  const [errors, setErrors] = useState<string[]>([])

  // Mutación
  const m = useMutation({
    mutationFn: async ()=>{
      const e1 = validarCabecera(nro, fecha, venc)
      const e2 = validarItems(items)
      const errs = [...e1, ...e2]
      if(errs.length){ setErrors(errs); throw new Error('Validación') }

      const payload = {
        cliente: clienteId,
        proyecto: proyectoSel ?? null, // <- opcional
        nro, fecha, vencimiento: venc, moneda,
        items: filas
          .filter(f => f.descripcion && f.qty>0 && f.precio_unit>=0)
          .map(f => ({ descripcion:f.descripcion, qty:f.qty, precio_unit:f.precio_unit, impuesto:f.impuesto }))
      }
      return (await api.post('/facturas/?enviar_mail=1', payload)).data
    },
    onSuccess: ()=>{
      setErrors([])
      onSaved()
    },
    onError: (e:any)=>{
      if (e?.response?.data){
        const d = e.response.data
        const errs = Object.entries(d).map(([k,v])=> `${k}: ${Array.isArray(v)?v.join(', '):v}`)
        setErrors(errs)
      }
    }
  })

  if(!open) return null

  return (
    <Modal open={open} onClose={onClose} title="Nueva factura">
      {/* Cabecera */}
      <div className="grid2">
        <label>Número
          <input value={nro} onChange={e=>setNro(e.target.value)} placeholder="F-0001-00001234"/>
        </label>

        <label>Proyecto (opcional)
          <select
            value={proyectoSel ?? ''}
            onChange={e=> setProyectoSel(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Sin proyecto —</option>
            {proyectos.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>

        <label>Moneda
          <input value={moneda} onChange={e=>setMoneda(e.target.value)} placeholder="ARS"/>
        </label>
        <label>Fecha
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
        </label>
        <label>Vencimiento
          <input type="date" value={venc} onChange={e=>setVenc(e.target.value)} />
        </label>
      </div>

      {/* Ítems */}
      <h4>Ítems</h4>
      <div className="table-like">
        <div className="table-like-head">
          <div>Descripción</div><div>Cantidad</div><div>Precio unitario</div><div>Impuesto %</div><div>Subtotal</div><div/>
        </div>
        {items.map((it,i)=>(
          <div className="table-like-row" key={i}>
            <div>
              <input placeholder="Servicio" value={it.descripcion}
                     onChange={e=>setItem(i,{descripcion:e.target.value})}/>
            </div>
            <div>
              <input type="text" inputMode="decimal" value={it.qty}
                     onChange={e=>setItem(i,{qty: num(e.target.value)})} placeholder="1"/>
            </div>
            <div>
              <input type="text" inputMode="decimal" value={it.precio_unit}
                     onChange={e=>setItem(i,{precio_unit: num(e.target.value)})} placeholder="0,00"/>
            </div>
            <div>
              <input type="text" inputMode="decimal" value={it.impuesto}
                     onChange={e=>setItem(i,{impuesto: num(e.target.value)})} placeholder="21"/>
            </div>
            <div style={{textAlign:'right'}}>${filas[i].subtotal.toLocaleString('es-AR')}</div>
            <div className="row">
              <button className="btn danger" onClick={()=>removeItem(i)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn ghost" onClick={addItem}>Agregar ítem</button>

      {/* Total + acciones */}
      <div className="row" style={{marginTop:14}}>
        <div className="spacer"/>
        <div style={{fontWeight:700}}>TOTAL: ${total.toLocaleString('es-AR')}</div>
      </div>

      <div className="row" style={{marginTop:10}}>
        <div className="spacer"/>
        {errors.length>0 && (
          <div className="alert error">
            <ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
          </div>
        )}
        <Button kind="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>m.mutate()} disabled={m.isPending}>
          {m.isPending ? 'Creando…' : 'Crear y enviar'}
        </Button>
      </div>
    </Modal>
  )
}
