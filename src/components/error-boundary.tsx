"use client"

import { Component, type ReactNode } from "react"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#222222] p-8 text-center">
            <p className="rd-label text-[#f87171]">Runtime error</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              Something went wrong
            </h2>
            <p className="mt-3 text-sm text-[#9ca3af]">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rd-button-primary mt-6"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
