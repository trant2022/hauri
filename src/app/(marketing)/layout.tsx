import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            unlockt
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition hover:text-white"
            >
              Login
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; 2026 Unlockt. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
