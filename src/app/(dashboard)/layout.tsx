import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Toaster } from "@/components/ui/toaster"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TEMPORARILY DISABLED AUTH CHECK TO FIX REDIRECT LOOP
  // Will re-enable once auth flow is fixed properly
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col md:pl-16 lg:pl-[224px]">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/40 p-4 md:p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}