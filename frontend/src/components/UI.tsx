import type { ReactNode } from 'react'
import React from 'react';

export function Card({title, action, children}:{title?:string, action?:ReactNode, children:ReactNode}){
return (
<div className="card">
{(title||action) && (
<div className="card-head">
<div className="card-title">{title}</div>
<div className="card-actions">{action}</div>
</div>
)}
<div className="card-body">{children}</div>
</div>
)
}

type BtnKind = 'ghost' | 'primary' | 'danger' | 'warn' | 'success';

// 👇 Extiende los atributos nativos de <button>
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: BtnKind;
};

export function Button({ kind = 'primary', className, children, ...props }: ButtonProps) {
  const base = 'btn';
  const kindCls =
      kind === 'ghost'   ? ' ghost'
    : kind === 'danger'  ? ' danger'
    : kind === 'warn'    ? ' warn'
    : kind === 'success' ? ' success'
    : ''; // primary por defecto (sin sufijo)
  return (
    <button
      {...props}
      className={`${base}${kindCls}${className ? ' ' + className : ''}`}
    >
      {children}
    </button>
  );
}



export function Modal({open, onClose, title, children}:{open:boolean, onClose:()=>void, title:string, children:ReactNode}){
if(!open) return null
return (
<div className="modal" onClick={onClose}>
<div className="modal-card" onClick={e=>e.stopPropagation()}>
<div className="row">
<h3>{title}</h3>
<div className="spacer"/>
<button onClick={onClose} className="btn ghost">✕</button>
</div>
<div style={{marginTop:12}}>{children}</div>
</div>
</div>
)
}


export function Toolbar({children}:{children:ReactNode}){
return <div className="toolbar">{children}</div>
}