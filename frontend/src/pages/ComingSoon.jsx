import { Link } from 'react-router-dom'
import { Hammer } from 'lucide-react'

export default function ComingSoon({ title, note }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <Hammer className="mb-3 text-slate-300" size={40} />
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{note}</p>
      <Link to="/map" className="mt-4 text-sm font-medium text-teal-700 hover:underline">Open the Map Explorer</Link>
    </div>
  )
}