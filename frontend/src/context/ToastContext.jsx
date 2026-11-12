import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Check, CircleAlert, Info } from 'lucide-react'

const ToastContext = createContext(null)
const STYLES = {
  success: ['bg-emerald-600', Check],
  error: ['bg-red-600', CircleAlert],
  info: ['bg-slate-800', Info],
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, type) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  const api = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[3000] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const [bg, Icon] = STYLES[t.type]
          return (
            <div key={t.id} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm text-white shadow-lg ${bg}`}>
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)