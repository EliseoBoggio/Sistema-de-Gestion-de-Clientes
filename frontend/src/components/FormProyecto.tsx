import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Modal, Button } from './UI'
import type { Proyecto } from '../types'

type Props = {
  open: boolean
  fixedClienteId: number
  mode?: 'new' | 'edit'
  initial?: Proyecto | null
  onClose: () => void
  onSaved: () => void
}

export default function FormProyecto({
  open, fixedClienteId, mode = 'new', initial = null, onClose, onSaved
}: Props){
  const qc = useQueryClient()
  const isEdit = mode === 'edit'

  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [estado, setEstado] = useState<Proyecto['estado']>(initial?.estado ?? 'EN_PROCESO')
  const [fecha_inicio, setFIni] = useState<string>(initial?.fecha_inicio ?? '')
  const [fecha_fin_prev, setFFin] = useState<string>(initial?.fecha_fin_prev ?? '')
  const [errors, setErrors] = useState<string[] | null>(null)

  // Si cambian props (cuando abrís en modo editar), hidratar campos
  useEffect(()=>{
    if (isEdit && initial){
      setNombre(initial.nombre || '')
      setEstado(initial.estado || 'EN_PROCESO')
      setFIni(initial.fecha_inicio || '')
      setFFin(initial.fecha_fin_prev || '')
      setErrors(null)
    }
    if (!open) {
      // al cerrar, limpiar
      setErrors(null)
    }
  }, [open, isEdit, initial])

  const validate = ()=>{
    const e:string[] = []
    if (!nombre.trim()) e.push('El nombre del proyecto es obligatorio.')
    if (fecha_inicio && fecha_fin_prev && new Date(fecha_fin_prev) < new Date(fecha_inicio)){
      e.push('La fecha de fin prevista no puede ser anterior a la fecha de inicio.')
    }
    return e
  }

  const m = useMutation({
    mutationFn: async ()=>{
      const e = validate()
      if (e.length){ setErrors(e); throw new Error('Validación') }
      const payload = {
        cliente: fixedClienteId,
        nombre: nombre.trim(),
        estado,
        fecha_inicio: fecha_inicio || null,
        fecha_fin_prev: fecha_fin_prev || null,
      }
      if (isEdit && initial){
        return (await api.put(`/proyectos/${initial.id}/`, payload)).data
      } else {
        return (await api.post('/proyectos/', payload)).data
      }
    },
    onSuccess: ()=>{
      setErrors(null)
      // refrescar listados relacionados
      qc.invalidateQueries({ queryKey: ['cliente', fixedClienteId, 'proyectos'] })
      onSaved()
    },
    onError: (err: any)=>{
      // mostrar errores del backend si vienen
      if (err?.response?.data){
        const d = err.response.data
        const list = Object.entries(d).map(([k,v])=> `${k}: ${Array.isArray(v)?v.join(', '):v}`)
        setErrors(list.length ? list : ['Error al guardar'])
      } else {
        setErrors(['Error al guardar'])
      }
    }
  })

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}>
      {errors && <div className="alert error"><ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
      <div className="grid2">
        <label>Nombre
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Proyecto X" />
        </label>
        <label>Estado
          <select value={estado} onChange={e=>setEstado(e.target.value as Proyecto['estado'])}>
            <option value="EN_PROCESO">EN_PROCESO</option>
            <option value="PAUSADO">PAUSADO</option>
            <option value="FINALIZADO">FINALIZADO</option>
          </select>
        </label>
        <label>Fecha inicio
          <input type="date" value={fecha_inicio||''} onChange={e=>setFIni(e.target.value)} />
        </label>
        <label>Fin previsto
          <input type="date" value={fecha_fin_prev||''} onChange={e=>setFFin(e.target.value)} />
        </label>
      </div>

      <div className="row" style={{marginTop:12}}>
        <div className="spacer" />
        <Button kind="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>m.mutate()} disabled={m.isPending}>
          {m.isPending ? 'Guardando…' : (isEdit ? 'Guardar' : 'Crear')}
        </Button>
      </div>
    </Modal>
  )
}
