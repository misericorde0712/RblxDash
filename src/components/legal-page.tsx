import Link from "next/link"

export default function LegalPage({
  title,
  description,
  sections,
}: {
  title: string
  description: string
  sections: Array<{
    title: string
    body: string
  }>
}) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#e8822a]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8822a] text-xs font-bold text-[#1a1a1a]">
                D
              </span>
              RblxDash
            </Link>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#9ca3af]">
              {description}
            </p>
          </div>

          <Link
            href="/register"
            className="rd-button-primary"
          >
            Create account
          </Link>
        </div>

        <div className="mt-10 space-y-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rd-card p-6"
            >
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#9ca3af]">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
