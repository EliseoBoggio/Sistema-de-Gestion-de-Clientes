export function StatusPill({value}:{value:string}){
  const color = ({
    'ABIERTA':'#f97316',     // naranja
    'PARCIAL':'#fbbf24',     // ámbar
    'PAGADA':'#22c55e',      // verde
    'ANULADA':'#94a3b8',     // gris
    'EN_PROCESO':'#60a5fa',  // azul
    'PAUSADO':'#f59e0b',     // mostaza
    'FINALIZADO':'#10b981',  // verde
  } as Record<string,string>)[value] || '#a78bfa'
  return <span className="pill" style={{backgroundColor:color, color:'#0b0f16'}}>{value}</span>
}
