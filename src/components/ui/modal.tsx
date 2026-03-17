"use client"

import { useEffect, useRef, type ReactNode } from "react"

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const handler = () => onClose()
    el.addEventListener("close", handler)
    return () => el.removeEventListener("close", handler)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-w-lg w-full rounded-2xl border border-[#2a2a2a] bg-[#222222] p-0 text-white backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="p-6">
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rd-icon-button text-[#9ca3af] hover:text-white"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  )
}
