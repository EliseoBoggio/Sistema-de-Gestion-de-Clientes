import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info' | 'warning'
type Toast = { id: number; msg: string; type: ToastType }

type Ctx = {
  show: (msg: string, type?: ToastType, ms?: number) => void
  success: (msg: string, ms?: number) => void
  error: (msg: string, ms?: number) => void
  info: (msg: string, ms?: number) => void
  warning: (msg: string, ms?: number) => void
}

const ToastCtx = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const api: Ctx = useMemo(() => ({
    show: (msg, type='info', ms=3000) => {
      const id = nextId.current++
      setToasts(ts => [...ts, { id, msg, type }])
      setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), ms)
    },
    success: (msg, ms) => api.show(msg, 'success', ms),
    error:   (msg, ms) => api.show(msg, 'error', ms),
    info:    (msg, ms) => api.show(msg, 'info', ms),
    warning: (msg, ms) => api.show(msg, 'warning', ms),
  }), [])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div style={wrap}>
          {toasts.map(t => (
            <div key={t.id} style={{...toast, ...byType[t.type]}}>
              {t.msg}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

// ── estilos inline mínimos (puedes pasarlos a CSS si querés)
const wrap: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  zIndex: 9999,
}

const toast: React.CSSProperties = {
  minWidth: 260,
  maxWidth: 380,
  padding: '10px 14px',
  borderRadius: 10,
  color: 'white',
  boxShadow: '0 6px 18px rgba(0,0,0,.15)',
  fontWeight: 500,
}

const byType: Record<ToastType, React.CSSProperties> = {
  success: { background: '#16a34a' },
  error:   { background: '#ef4444' },
  info:    { background: '#3b82f6' },
  warning: { background: '#f59e0b' },
}
