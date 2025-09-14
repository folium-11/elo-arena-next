export default function Card({children,className='' }:{children:React.ReactNode;className?:string}){return <section className={`card-glass ${className}`}>{children}</section>}
