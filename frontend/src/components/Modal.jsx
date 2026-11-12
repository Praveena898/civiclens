import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Spinner, btnDanger, btnSecondary } from './ui'

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`max-h-[92vh] w-full overflow-auto rounded-xl bg-white shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className={btnSecondary} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnDanger} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}