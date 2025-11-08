import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Modal, Button } from './UI'
import type { Cliente } from '../types'

function toNull(s: string | undefined | null){
  if (s === undefined || s === null) return null
  const t = String(s).trim()
  return t === '' ? null : t
}

export default function FormCliente({
  mode, initial, onClose, onSaved
}:{
  mode: 'new' | 'edit',
  initial?: Cliente,
  onClose: ()=>void,
  onSaved: ()=>void
}){
  const qc = useQueryClient()
  const [razon_social, setRazonSocial] = useState(initial?.razon_social ?? '')
  const [cuit, setCuit] = useState(initial?.cuit ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')
  const [estado, setEstado] = useState(initial?.estado ?? 'ACTIVO')
  const [errors, setErrors] = useState<string[] | null>(null)

  useEffect(()=>{
    if(mode==='edit' && initial){
      setRazonSocial(initial.razon_social||'')
      setCuit(initial.cuit||'')
      setEmail(initial.email||'')
      setTelefono(initial.telefono||'')
      setEstado(initial.estado||'ACTIVO')
    }
  },[mode, initial])

  const validate = ()=>{
    const errs:string[] = []
    if(!razon_social.trim()) errs.push('La razón social es obligatoria.')
    if (cuit && cuit.trim().length < 8) errs.push('CUIT inválido (mín. 8 dígitos).')
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errs.push('Email inválido.')
    return errs
  }

  const m = useMutation({
    mutationFn: async ()=>{
      const errs = validate()
      if (errs.length){ setErrors(errs); throw new Error('Validación'); }
      const payload = {
        razon_social: razon_social.trim(),
        cuit: toNull(cuit),
        email: toNull(email),
        telefono: toNull(telefono),
        estado
      }
      if (mode==='new'){
        return (await api.post('/clientes/', payload)).data
      }else{
        return (await api.put(`/clientes/${initial!.id}/`, payload)).data
      }
    },
    onSuccess: ()=>{
      setErrors(null)
      qc.invalidateQueries({queryKey:['clientes']})
      onSaved()
    },
    onError: (e: any)=>{
      // si el backend mandó detalle de DRF
      if (e?.response?.data){
        const d = e.response.data
        const errs = Object.entries(d).map(([k,v])=> `${k}: ${Array.isArray(v)?v.join(', '):v}`)
        setErrors(errs)
      }
    }
  })

  return (
    <Modal open onClose={onClose} title={mode==='new'?'Nuevo cliente':'Editar cliente'}>
      {errors && <div className="alert error"><ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}

      <div className="grid2">
        <label>Razón social
          <input value={razon_social} onChange={e=>setRazonSocial(e.target.value)} placeholder="Cliente S.A." />
        </label>
        <label>CUIT
          <input value={cuit} onChange={e=>setCuit(e.target.value)} placeholder="30-xxxxxxxx-x" />
        </label>
        <label>Email
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="contacto@cliente.com" />
        </label>
        <label>Teléfono
          <input value={telefono} onChange={e=>setTelefono(e.target.value)} placeholder="381-..." />
        </label>
        <label>Estado
        <select
          value={estado}
          onChange={e => setEstado(e.target.value as 'ACTIVO' | 'INACTIVO')}
        >

            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </label>
      </div>

      <div className="row" style={{marginTop:12}}>
        <div className="spacer"/>
        <Button kind="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>m.mutate()} disabled={m.isPending}>
          {m.isPending ? 'Guardando…' : (mode==='new'?'Crear':'Guardar')}
        </Button>
      </div>
    </Modal>
  )
}
