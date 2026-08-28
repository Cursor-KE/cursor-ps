import Image from "next/image"
import Link from "next/link"

type LogoSize = "sm" | "md"

type CursorLogoProps = {
  href?: string
  size?: LogoSize
}

function logoSize(size: LogoSize): { width: number; height: number } {
  switch (size) {
    case "sm":
      return { width: 118, height: 28 }
    case "md":
      return { width: 176, height: 42 }
    default: {
      const _exhaustive: never = size
      return _exhaustive
    }
  }
}

export function CursorLogo({ href = "/", size = "sm" }: CursorLogoProps) {
  const { width, height } = logoSize(size)
  const mark = (
    <Image
      src="/brand/lockup-horizontal-2d-dark.svg"
      alt="Cursor"
      width={width}
      height={height}
      priority
      unoptimized
    />
  )

  if (!href) {
    return mark
  }

  return (
    <Link href={href} aria-label="Cursor" className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-accent">
      {mark}
    </Link>
  )
}
