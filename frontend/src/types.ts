export type Cliente = {
id: number
razon_social: string
cuit?: string
email?: string
telefono?: string
estado: 'ACTIVO' | 'INACTIVO'
fecha_alta: string
}


export type Proyecto = {
id: number
cliente: number
nombre: string
estado: string
fecha_inicio?: string | null
fecha_fin_prev?: string | null
}


export type FacturaItem = { id?: number; descripcion: string; qty: number; precio_unit: number; impuesto?: number }


export type Factura = {
id: number
cliente: number
proyecto?: number | null
nro: string
fecha: string
vencimiento: string
estado: 'ABIERTA' | 'PARCIAL' | 'PAGADA' | 'ANULADA'
total: number
moneda: string
items?: FacturaItem[]
}


export type Pago = { id?: number; factura: number; fecha: string; monto: number; medio?: string; referencia?: string }


export type Historial = { id: number; cliente: number; fecha: string; tipo: string; nota?: string; usuario?: number | null }


export type AgingDict = { '0-30': number; '31-60': number; '61-90': number; '90+': number }