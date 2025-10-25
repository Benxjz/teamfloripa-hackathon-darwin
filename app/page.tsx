import { ConversationTable } from "@/components/conversation-table"
import Image from "next/image"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1600px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
              <h1 className="text-4xl font-bold tracking-tight text-blue-700">Desempenho do worker</h1>
            </div>
            <p className="text-base text-muted-foreground">Monitorar e analisar o desempenho do worker</p>
          </div>
          <ConversationTable />
        </div>
      </div>
    </main>
  )
}
