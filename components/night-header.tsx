import Link from "next/link"
import { CursorLogo } from "@/components/cursor-logo"

type NightHeaderProps = {
  actionHref: string
  actionLabel: string
  variant?: "night" | "ucl"
}

export function NightHeader({ actionHref, actionLabel, variant = "night" }: NightHeaderProps) {
  const isUcl = variant === "ucl"

  return (
    <header
      className={
        isUcl
          ? "ucl-chrome"
          : "flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6"
      }
    >
      {isUcl ? (
        <>
          <div className="ucl-chrome-brand">
            <CursorLogo />
            <p className="ucl-kicker">Cursor Nairobi · Build Night · FIFA Best 16</p>
          </div>
          <Link href={actionHref} className="ucl-link">
            {actionLabel}
          </Link>
        </>
      ) : (
        <>
          <div>
            <CursorLogo />
            <p className="mt-5 font-display text-xs tracking-[0.28em] text-accent uppercase">
              Cursor Nairobi · Build Night
            </p>
            <h1 className="mt-2 font-display text-5xl leading-none tracking-wide uppercase md:text-6xl">
              FIFA Best 16
            </h1>
          </div>
          <Link
            href={actionHref}
            className="rounded-sm border border-ink px-4 py-2 text-sm font-semibold text-ink outline-none hover:border-accent hover:text-accent focus-visible:border-accent"
          >
            {actionLabel}
          </Link>
        </>
      )}
    </header>
  )
}
