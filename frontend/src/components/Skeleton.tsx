export function Skeleton({rows=3}:{rows?:number}){
  return (
    <div className="skeleton">
      {Array.from({length:rows}).map((_,i)=> <div key={i} className="skl-row"/>)}
    </div>
  )
}
