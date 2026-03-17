"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

type ToastVariant = "success" | "error" | "info"

type Toast = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextType = {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.1)] text-[#bbf7d0]",
  error: "border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] text-[#fecaca]",
  info: "border-[rgba(232,130,42,0.3)] bg-[rgba(232,130,42,0.1)] text-[#fdba74]",
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-[rd-fade-in_0.2s_ease-out] rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${VARIANT_STYLES[t.variant]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
