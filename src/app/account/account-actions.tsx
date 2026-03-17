"use client"

import { useClerk } from "@clerk/nextjs"

const profileAppearance = {
  variables: {
    colorPrimary:       "#e8822a",
    colorBackground:    "#1a1a1a",
    colorInputBackground: "#252525",
    colorInputText:     "#f0f0f0",
    colorText:          "#f0f0f0",
    colorTextSecondary: "#888888",
    colorNeutral:       "#3a3a3a",
    colorDanger:        "#f87171",
    colorSuccess:       "#4ade80",
    colorShimmer:       "#242424",
    borderRadius:       "0.625rem",
    fontFamily:         "inherit",
    fontFamilyButtons:  "inherit",
    fontSize:           "0.875rem",
  },
  elements: {
    // ── Overlay & container ───────────────────────────────────────────────
    modalBackdrop:
      "bg-black/80 backdrop-blur-sm",
    modalContent:
      "shadow-2xl border border-[#2a2a2a] bg-[#1a1a1a] rounded-2xl overflow-hidden",

    // ── Sidebar nav inside modal ──────────────────────────────────────────
    navbar:
      "bg-[#141414] border-r border-[#242424]",
    navbarButton:
      "rounded-lg text-[#888] hover:bg-[#1e1e1e] hover:text-white transition-colors",
    navbarButtonActive:
      "rounded-lg bg-[rgba(232,130,42,0.12)] text-[#e8822a] border border-[rgba(232,130,42,0.2)] hover:bg-[rgba(232,130,42,0.18)] hover:text-[#e8822a]",
    navbarButtonIcon:
      "text-current",
    navbarMobileMenuButton:
      "text-[#888] hover:text-white",

    // ── Scroll + page area ────────────────────────────────────────────────
    scrollBox:
      "bg-[#1a1a1a]",
    pageScrollBox:
      "bg-[#1a1a1a]",
    page:
      "bg-[#1a1a1a]",
    pageHeader:
      "border-b border-[#242424] pb-4 mb-4",

    // ── Section cards ─────────────────────────────────────────────────────
    profileSectionTitle:
      "border-b border-[#242424]",
    profileSectionTitleText:
      "text-sm font-semibold text-white",
    profileSectionContent:
      "rounded-xl border border-[#252525] bg-[#1e1e1e]",
    profileSectionItem:
      "border-b border-[#242424] last:border-0",
    profileSectionPrimaryButton:
      "rounded-lg border border-[#2a2a2a] bg-[#252525] text-white hover:bg-[#2a2a2a] text-sm font-medium transition-colors",

    // ── User preview ──────────────────────────────────────────────────────
    userPreviewMainIdentifier:
      "text-white font-semibold",
    userPreviewSecondaryIdentifier:
      "text-[#888]",
    userPreviewAvatarBox:
      "rounded-xl",

    // ── Accordion ─────────────────────────────────────────────────────────
    accordionTriggerButton:
      "text-white hover:bg-[#252525] rounded-lg transition-colors",
    accordionContent:
      "bg-[#1e1e1e]",

    // ── Form ─────────────────────────────────────────────────────────────
    formButtonPrimary:
      "rounded-lg bg-[#e8822a] hover:bg-[#f1913f] text-white shadow-none font-semibold transition-colors",
    formButtonReset:
      "rounded-lg border border-[#2a2a2a] bg-transparent text-[#888] hover:bg-[#252525] hover:text-white transition-colors",
    formFieldLabel:
      "text-sm font-medium text-[#ccc]",
    formFieldInput:
      "rounded-lg border border-[#2a2a2a] bg-[#252525] text-white placeholder:text-[#555] focus:border-[#e8822a] focus:ring-0 transition-colors",
    formFieldInputShowPasswordButton:
      "text-[#666] hover:text-white",
    formFieldSuccessText:
      "text-[#4ade80] text-xs",
    formFieldErrorText:
      "text-[#f87171] text-xs",
    formFieldWarningText:
      "text-[#fbbf24] text-xs",
    formFieldHintText:
      "text-[#666] text-xs",
    formResendCodeLink:
      "text-[#e8822a] hover:text-[#f1913f]",
    formFieldAction:
      "text-[#e8822a] hover:text-[#f1913f] text-xs",

    // ── Connected accounts / identity ─────────────────────────────────────
    identityPreviewText:
      "text-[#ccc]",
    identityPreviewEditButtonIcon:
      "text-[#e8822a]",

    // ── Badge / tag / chip ────────────────────────────────────────────────
    badge:
      "rounded-full border border-[#2a2a2a] bg-[#1e1e1e] text-[#888] text-[11px]",
    tagInputItem:
      "rounded-md border border-[#2a2a2a] bg-[#252525] text-[#ccc]",

    // ── Social buttons ────────────────────────────────────────────────────
    socialButtonsBlockButton:
      "rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] text-white hover:bg-[#252525] transition-colors",
    socialButtonsBlockButtonText:
      "text-sm font-medium",

    // ── Dividers ──────────────────────────────────────────────────────────
    dividerLine:
      "bg-[#242424]",
    dividerText:
      "text-[#555] text-xs",

    // ── OTP input ─────────────────────────────────────────────────────────
    otpCodeFieldInput:
      "rounded-lg border border-[#2a2a2a] bg-[#252525] text-white",

    // ── Footer ────────────────────────────────────────────────────────────
    footerActionText:
      "text-[#555]",
    footerActionLink:
      "text-[#e8822a] hover:text-[#f1913f]",
    footerPageLink:
      "text-[#e8822a] hover:text-[#f1913f]",
  },
} as const

const buttonBase =
  "group rd-card relative overflow-hidden px-5 py-4 text-left text-sm text-[#9ca3af] hover:border-[#333] hover:text-white transition-colors"

function ActionButton(props: {
  eyebrow: string
  title: string
  copy: string
  onClick: () => void
}) {
  return (
    <button className={buttonBase} onClick={props.onClick} type="button">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(232,130,42,0.12),_transparent_32%)] opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "#e8822a" }}>
            {props.eyebrow}
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{props.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#888" }}>{props.copy}</p>
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition group-hover:border-[rgba(232,130,42,0.3)] group-hover:bg-[rgba(232,130,42,0.06)]"
          style={{ borderColor: "#2a2a2a", background: "#1a1a1a", color: "#e8822a" }}
        >
          →
        </span>
      </div>
    </button>
  )
}

export function AccountActions() {
  const clerk = useClerk()

  const openProfile = (startPath?: string) => {
    clerk.openUserProfile({
      appearance: profileAppearance,
      apiKeysProps: { hide: true },
      ...(startPath ? { __experimental_startPath: startPath } : {}),
    })
  }

  return (
    <div className="grid gap-3">
      <ActionButton
        eyebrow="Profile"
        title="Edit profile"
        copy="Update your name, avatar, and account identity."
        onClick={() => openProfile("/account")}
      />
      <ActionButton
        eyebrow="Security"
        title="Manage security"
        copy="Passwords, active sessions, passkeys, and 2FA."
        onClick={() => openProfile("/security")}
      />
    </div>
  )
}
