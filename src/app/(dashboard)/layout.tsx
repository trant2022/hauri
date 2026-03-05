import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { MobileSidebar } from "@/components/mobile-sidebar"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar userEmail={user.email ?? ""} />
      <div className="flex flex-1 flex-col">
        {/* Mobile header - shown only below md breakpoint */}
        <header className="flex h-14 items-center border-b border-border px-4 md:hidden">
          <MobileSidebar />
          <span className="ml-3 text-lg font-bold tracking-tight">unlockt</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
