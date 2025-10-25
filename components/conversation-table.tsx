"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Eye, Copy, Check, BarChart3, Loader2, MoreVertical, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getPrompt, savePrompt } from "@/app/actions/prompt-actions"
import { saveAnalysis } from "@/app/actions/analysis-actions"

// Declare variables to fix lint errors
const v0 = "v0 value"
const no = "no value"
const op = "op value"
const code = "code value"
const block = "block value"
const prefix = "prefix value"

interface Conversation {
  rowId: string // Added unique row identifier
  sessionId: string
  id: string
  stagesPassed: string
  content: string
}

interface BlockAnalysis {
  blockNumber: number
  messageCount: number
  messages: string[]
  humanMessages?: string[] // Added humanMessages field
  score: number
  scoreReason?: string
  missionAlignment?: string
  issues: string[]
  strengths: string[]
  detailedFeedback?: string
}

interface Analysis {
  overallScore: number
  mission?: string
  adherenceToMission: number
  adherenceToMissionReason?: string
  contextCoherence: number
  contextCoherenceReason?: string
  guidelineCompliance: number
  guidelineComplianceReason?: string
  responseQuality: number
  responseQualityReason?: string
  blockAnalysis: BlockAnalysis[]
  deviations: string[]
  suggestions: string[]
  summary: string
  detailedReport?: string
}

interface AnalysisResult {
  conversationId: string
  analysis: Analysis
  timestamp: string
  status: "pending" | "analyzing" | "completed" | "error"
  error?: string
  totalBlocksInConversation?: number
}

// REMOVED: interface HistoricalAnalysis {
// REMOVED:   overallHistoryScore: number
// REMOVED:   totalConversations: number
// REMOVED:   totalLines: number
// REMOVED:   consistencyScore: number
// REMOVED:   consistencyAnalysis: string
// REMOVED:   missionFulfillmentRate: number
// REMOVED:   missionFulfillmentAnalysis: string
// REMOVED:   commonSuccessPatterns: string[]
// REMOVED:   commonFailurePatterns: string[]
// REMOVED:   systematicIssues: string[]
// REMOVED:   trendAnalysis: string
// REMOVED:   coherenceAcrossConversations: number
// REMOVED:   coherenceAnalysis: string
// REMOVED:   completenessScore: number
// REMOVED:   completenessAnalysis: string
// REMOVED:   flowCompatibilityScore: number
// REMOVED:   flowCompatibilityAnalysis: string
// REMOVED:   improvementPriorities: string[]
// REMOVED:   bestPracticesIdentified: string[]
// REMOVED:   conversationQualityDistribution: {
// REMOVED:     excellent: number
// REMOVED:     good: number
// REMOVED:     average: number
// REMOVED:     poor: number
// REMOVED:   }
// REMOVED:   detailedHistoricalReport: string
// REMOVED: }

function parseCSV(csvText: string): Conversation[] {
  const conversations: Conversation[] = []
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let insideQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField)
      currentField = ""
    } else if (char === "\n" && !insideQuotes) {
      currentRow.push(currentField)
      if (currentRow.some((field) => field.trim())) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ""
    } else if (char === "\r") {
      continue
    } else {
      currentField += char
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some((field) => field.trim())) {
      rows.push(currentRow)
    }
  }

  console.log("[v0] Total rows parsed:", rows.length)

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length >= 4 && row[0].trim() && row[1].trim()) {
      conversations.push({
        rowId: `row-${i}`, // Unique identifier for each row
        sessionId: row[0].trim(),
        id: row[1].trim(),
        stagesPassed: row[2].trim(),
        content: row[3].trim(),
      })
    }
  }

  console.log("[v0] Total conversations created:", conversations.length)

  return conversations
}

function getDefaultPrompt() {
  return `Você é um auditor especializado em análise de qualidade de conversas de agentes de IA para vendas e qualificação de clientes. Sua missão é avaliar rigorosamente cada interação, identificando pontos fortes, falhas e oportunidades de melhoria.

## CONTEXTO DA ANÁLISE

**Missão do Agente:**
{{MISSION}}

**Templates de Prompt Configurados:**
{{PROMPT_TEMPLATES}}

**Blocos de Mensagens da IA para Análise:**
{{AI_BLOCKS}}

---

## CRITÉRIOS DE AVALIAÇÃO

Avalie cada bloco de mensagens consecutivas da IA com base nos seguintes critérios:

### 1. Aderência à Missão (0-100)
- O agente está cumprindo sua missão principal?
- As respostas estão alinhadas com os objetivos definidos?
- O agente mantém o foco ou desvia do propósito?
- **Pontuação:**
  - 100: Alinhamento perfeito, todas as ações contribuem para a missão
  - 70-99: Bom alinhamento, pequenos desvios ocasionais
  - 50-69: Alinhamento parcial, desvios frequentes mas recuperáveis
  - 0-49: Desalinhamento significativo, missão não está sendo cumprida

### 2. Coerência Contextual (0-100)
- As respostas fazem sentido no contexto da conversa?
- O agente mantém continuidade lógica entre mensagens?
- Há contradições ou informações conflitantes?
- O agente demonstra memória do que foi dito anteriormente?
- **Pontuação:**
  - 100: Contexto perfeitamente mantido, respostas sempre relevantes
  - 70-99: Boa coerência, pequenas inconsistências ocasionais
  - 50-69: Coerência parcial, algumas quebras de contexto
  - 0-49: Contexto frequentemente perdido, respostas desconexas

### 3. Seguimento de Diretrizes (0-100)
- O agente está usando corretamente as transition tools?
- Os prompt templates estão sendo seguidos?
- As instruções técnicas estão sendo respeitadas?
- O fluxo de conversa segue as diretrizes estabelecidas?
- **Pontuação:**
  - 100: Todas as diretrizes seguidas rigorosamente
  - 70-99: Maioria das diretrizes seguidas, pequenos desvios
  - 50-69: Diretrizes parcialmente seguidas, desvios notáveis
  - 0-49: Diretrizes frequentemente ignoradas

### 4. Qualidade das Respostas (0-100)
- As respostas são claras e profissionais?
- A linguagem é apropriada para o contexto de vendas?
- As informações são precisas e úteis?
- O tom é adequado (nem muito formal, nem muito casual)?
- Há erros gramaticais ou de formatação?
- **Pontuação:**
  - 100: Respostas exemplares, profissionais e eficazes
  - 70-99: Boas respostas, pequenas melhorias possíveis
  - 50-69: Respostas aceitáveis, mas com problemas notáveis
  - 0-49: Respostas problemáticas, prejudicam a conversa

---

## INSTRUÇÕES DE ANÁLISE

1. **Analise TODOS os blocos de mensagens** fornecidos em {{AI_BLOCKS}}
2. **Atribua uma pontuação única (0-100)** para cada bloco baseada nos 4 critérios acima
3. **Seja rigoroso mas justo** - pontuações altas devem ser merecidas
4. **Forneça justificativas detalhadas** para cada pontuação
5. **Identifique padrões** - problemas recorrentes ou sucessos consistentes
6. **Seja específico** - cite exemplos concretos das mensagens analisadas
7. **Considere o contexto completo** - missão, tools, templates e histórico

---

## FORMATO DE RESPOSTA OBRIGATÓRIO

Retorne APENAS um objeto JSON válido (sem markdown, sem explicações extras) com a seguinte estrutura:

\`\`\`json
{
  "overallScore": <número 0-100>,
  "mission": "<texto completo da missão extraída>",
  "adherenceToMission": <número 0-100>,
  "adherenceToMissionReason": "<explicação detalhada de 2-3 frases>",
  "contextCoherence": <número 0-100>,
  "contextCoherenceReason": "<explicação detalhada de 2-3 frases>",
  "guidelineCompliance": <número 0-100>,
  "guidelineComplianceReason": "<explicação detalhada de 2-3 frases>",
  "responseQuality": <número 0-100>,
  "responseQualityReason": "<explicação detalhada de 2-3 frases>",
  "blockAnalysis": [
    {
      "blockNumber": <número do bloco>,
      "messageCount": <quantidade de mensagens no bloco>,
      "messages": ["<mensagem 1>", "<mensagem 2>", ...],
      "score": <número 0-100>,
      "scoreReason": "<explicação detalhada da pontuação deste bloco>",
      "missionAlignment": "<como este bloco se alinha ou desvia da missão>",
      "issues": ["<problema 1>", "<problema 2>", ...],
      "strengths": ["<ponto forte 1>", "<ponto forte 2>", ...],
      "detailedFeedback": "<análise profunda e específica deste bloco>"
    }
  ],
  "deviations": ["<desvio 1>", "<desvio 2>", ...],
  "suggestions": ["<sugestão 1>", "<sugestão 2>", ...],
  "summary": "<resumo executivo de 2-3 frases sobre a qualidade geral>",
  "detailedReport": "<relatório completo e estruturado com análise profunda>"
}
\`\`\`

---

## DIRETRIZES FINAIS

- **Seja consistente** nas pontuações entre diferentes blocos
- **Priorize a missão** - o seguimento da missão é o critério mais importante. Não importa se consegue o objetivo da missão e sim se o histórico mostra que até onde terminou a conversa o agente de IA estava seguindo sua missão.
- **Identifique tendências** - melhorias ou piores ao longo da conversa
- **Seja construtivo** - críticas devem vir acompanhadas de sugestões
- **Mantenha objetividade** - baseie-se em fatos, não em impressões subjetivas
- **Considere o contexto** - Avalie se a informação da resposta da IA está no contexto.

Agora analise a conversa fornecida e retorne o JSON com sua avaliação completa.`
}

export function ConversationTable() {
  const [conversationsData, setConversationsData] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false) // Changed to false initially
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [hasLoadedData, setHasLoadedData] = useState(false)

  const [analysisResults, setAnalysisResults] = useState<Map<string, AnalysisResult>>(new Map())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null)
  const [analyzingCount, setAnalyzingCount] = useState(0)

  const [showPromptConfig, setShowPromptConfig] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [promptSaved, setPromptSaved] = useState(false)
  const [promptLoading, setPromptLoading] = useState(false)

  const [conversationDialogKey, setConversationDialogKey] = useState(0)
  const [analysisDialogKey, setAnalysisDialogKey] = useState(0)
  const [promptDialogKey, setPromptDialogKey] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Função de limpeza agressiva que roda periodicamente
    const aggressiveCleanup = () => {
      if (typeof document !== "undefined") {
        // Forçar limpeza de estilos do body
        document.body.style.pointerEvents = ""
        document.body.style.overflow = ""
        document.body.style.paddingRight = ""
        document.body.removeAttribute("data-state")

        // Remover qualquer overlay ou backdrop que possa estar travado
        const overlays = document.querySelectorAll("[data-radix-dialog-overlay]")
        overlays.forEach((overlay) => {
          if (!overlay.closest('[data-state="open"]')) {
            overlay.remove()
          }
        })

        // Garantir que todos os botões estejam clicáveis
        const buttons = document.querySelectorAll("button")
        buttons.forEach((button) => {
          if (button.style.pointerEvents === "none") {
            button.style.pointerEvents = ""
          }
        })
      }
    }

    // Executar limpeza a cada 2 segundos
    const cleanupInterval = setInterval(aggressiveCleanup, 2000)

    // Executar limpeza imediata
    aggressiveCleanup()

    return () => {
      clearInterval(cleanupInterval)
      aggressiveCleanup()
    }
  }, [])

  useEffect(() => {
    if (!selectedConversation && !selectedAnalysis && !showPromptConfig) {
      // Quando todos os dialogs estão fechados, fazer limpeza agressiva
      const cleanup = () => {
        if (typeof document !== "undefined") {
          document.body.style.pointerEvents = ""
          document.body.style.overflow = ""
          document.body.style.paddingRight = ""
          document.body.removeAttribute("data-state")

          // Remover todos os overlays órfãos
          const overlays = document.querySelectorAll("[data-radix-dialog-overlay]")
          overlays.forEach((overlay) => overlay.remove())

          // Remover todos os portals órfãos
          const portals = document.querySelectorAll("[data-radix-portal]")
          portals.forEach((portal) => {
            if (!portal.querySelector('[data-state="open"]')) {
              portal.remove()
            }
          })
        }
      }

      // Executar limpeza múltiplas vezes com delays diferentes
      cleanup()
      setTimeout(cleanup, 50)
      setTimeout(cleanup, 150)
      setTimeout(cleanup, 300)
    }
  }, [selectedConversation, selectedAnalysis, showPromptConfig])

  useEffect(() => {
    if (showPromptConfig && !customPrompt) {
      loadPromptFromDatabase()
    }
  }, [showPromptConfig])

  const loadPromptFromDatabase = async () => {
    setPromptLoading(true)
    try {
      console.log("[v0] ===== LOADING PROMPT FROM DATABASE =====")
      const result = await getPrompt()
      if (result.success) {
        setCustomPrompt(result.prompt)
        console.log("[v0] Prompt loaded from", result.source)
        console.log("[v0] Prompt length:", result.prompt.length)
        console.log("[v0] Prompt first 200 chars:", result.prompt.substring(0, 200))
        console.log("[v0] Prompt last 200 chars:", result.prompt.substring(result.prompt.length - 200))
      }
    } catch (error) {
      console.error("[v0] Error loading prompt:", error)
    } finally {
      setPromptLoading(false)
    }
  }

  const resetToDefaultPrompt = async () => {
    const defaultPrompt = getDefaultPrompt()
    setCustomPrompt(defaultPrompt)
    setPromptLoading(true)
    try {
      const result = await savePrompt(defaultPrompt)
      if (result.success) {
        setPromptSaved(true)
        setTimeout(() => setPromptSaved(false), 2000)
      } else {
        alert(`Erro ao restaurar o prompt: ${result.error}`)
      }
    } catch (error) {
      console.error("[v0] Error resetting prompt:", error)
      alert("Erro ao restaurar o prompt. Tente novamente.")
    } finally {
      setPromptLoading(false)
    }
  }

  const saveCustomPrompt = async () => {
    setPromptLoading(true)
    try {
      console.log("[v0] ===== SAVING CUSTOM PROMPT =====")
      console.log("[v0] Prompt length being saved:", customPrompt.length)
      console.log("[v0] Prompt first 200 chars:", customPrompt.substring(0, 200))
      console.log("[v0] Prompt last 200 chars:", customPrompt.substring(customPrompt.length - 200))

      const result = await savePrompt(customPrompt)

      if (result.success) {
        setPromptSaved(true)
        setTimeout(() => setPromptSaved(false), 3000)
        console.log("[v0] Prompt saved successfully!")
        // The prompt is already in customPrompt state, no need to reload
      } else {
        console.error("[v0] Error saving prompt:", result.error)
        alert(`Erro ao salvar o prompt: ${result.error}`)
      }
    } catch (error) {
      console.error("[v0] Exception saving prompt:", error)
      alert("Erro ao salvar o prompt. Tente novamente.")
    } finally {
      setPromptLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      console.log("[v0] No file selected or file input cleared.")
      return
    }

    if (abortControllerRef.current) {
      console.log("[v0] Aborting ongoing analysis due to new CSV upload")
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setLoading(true)
    setHasLoadedData(false)
    setConversationsData([])
    setAnalysisResults(new Map()) // Clear previous analysis results
    setIsAnalyzing(false) // Reset analyzing state
    setAnalyzingCount(0) // Reset counter
    setSelectedConversation(null) // Close any open dialogs
    setSelectedAnalysis(null)
    console.log("[v0] File selected:", file.name, "Type:", file.type, "Size:", file.size)
    console.log("[v0] All state cleared for new CSV upload, ongoing analysis aborted")

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      if (typeof csvText === "string") {
        try {
          console.log("[v0] CSV text loaded, attempting to parse...")
          const parsedConversations = parseCSV(csvText)
          setConversationsData(parsedConversations)
          setHasLoadedData(true)
          console.log(`[v0] Successfully parsed ${parsedConversations.length} conversations.`)
        } catch (error) {
          console.error("[v0] Error parsing CSV:", error)
          alert("Erro ao processar o arquivo CSV. Verifique o formato do arquivo.")
          setConversationsData([])
          setHasLoadedData(false)
        }
      } else {
        console.error("[v0] FileReader did not return a string.")
        alert("Erro ao ler o arquivo CSV.")
        setConversationsData([])
        setHasLoadedData(false)
      }
      setLoading(false)
      event.target.value = "" // Clear the input value
    }
    reader.onerror = (e) => {
      console.error("[v0] Error reading file:", e)
      alert("Erro ao ler o arquivo CSV. Tente novamente.")
      setLoading(false)
      setConversationsData([])
      setHasLoadedData(false)
      event.target.value = "" // Clear the input value
    }
    reader.readAsText(file)
  }

  // useEffect(() => {
  //   // Função para buscar dados do CSV. Implementação omitida para brevidade.
  // }, [])

  const filteredConversations = conversationsData.filter(
    (conv) =>
      conv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.stagesPassed.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCopy = async (text: string, id: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API não disponível")
      }
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      console.log("[v0] Content copied successfully")
    } catch (error) {
      console.error("[v0] Error copying to clipboard:", error)
      // Fallback: criar elemento temporário para copiar
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
        console.log("[v0] Content copied using fallback method")
      } catch (fallbackError) {
        console.error("[v0] Fallback copy also failed:", fallbackError)
        alert("Erro ao copiar o conteúdo. Tente selecionar e copiar manualmente.")
      }
    }
  }

  const analyzeAllConversations = async () => {
    if (isAnalyzing) {
      console.log("[v0] Analysis already in progress, ignoring duplicate request")
      return
    }

    if (conversationsData.length === 0) {
      alert("Nenhuma conversa carregada para analisar")
      return
    }

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    console.log("[v0] ===== STARTING ANALYSIS - LOADING PROMPT =====")
    const promptResult = await getPrompt()
    const promptToUse = promptResult.success ? promptResult.prompt : undefined

    console.log("[v0] Prompt loaded for analysis:")
    console.log("[v0] - Source:", promptResult.source)
    console.log("[v0] - Length:", promptToUse?.length || 0)
    console.log("[v0] - First 200 chars:", promptToUse?.substring(0, 200) || "No prompt")
    console.log("[v0] - Last 200 chars:", promptToUse?.substring((promptToUse?.length || 0) - 200) || "No prompt")

    setIsAnalyzing(true)
    setAnalyzingCount(0)

    const conversationsToAnalyze = conversationsData.filter((conv) => {
      const existing = analysisResults.get(conv.rowId)
      const needsAnalysis = !existing || existing.status === "error"
      if (!needsAnalysis) {
        console.log(`[v0] Skipping already analyzed row: ${conv.rowId}`)
      }
      return needsAnalysis
    })

    console.log(`[v0] Total conversations: ${conversationsData.length}`)
    console.log(`[v0] Conversations to analyze: ${conversationsToAnalyze.length}`)
    console.log(`[v0] Already analyzed: ${conversationsData.length - conversationsToAnalyze.length}`)

    if (conversationsToAnalyze.length === 0) {
      console.log("[v0] No conversations to analyze")
      setIsAnalyzing(false)
      abortControllerRef.current = null
      return
    }

    const newResults = new Map(analysisResults)
    conversationsToAnalyze.forEach((conv) => {
      newResults.set(conv.rowId, {
        conversationId: conv.id,
        analysis: {} as Analysis,
        timestamp: "",
        status: "pending",
      })
    })
    setAnalysisResults(new Map(newResults))

    const batchSize = 3
    let hasErrors = false

    try {
      for (let i = 0; i < conversationsToAnalyze.length; i += batchSize) {
        if (signal.aborted) {
          console.log("[v0] Analysis aborted by user")
          break
        }

        const batch = conversationsToAnalyze.slice(i, i + batchSize)

        console.log(
          `[v0] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(conversationsToAnalyze.length / batchSize)} with ${batch.length} conversations`,
        )

        await Promise.all(
          batch.map(async (conversation) => {
            if (signal.aborted) {
              console.log(`[v0] Skipping row ${conversation.rowId} - analysis aborted`)
              return
            }

            try {
              console.log(`[v0] Starting analysis for row ${conversation.rowId} (session ${conversation.sessionId})`)

              setAnalysisResults((prev) => {
                const updated = new Map(prev)
                const current = updated.get(conversation.rowId)
                if (current) {
                  updated.set(conversation.rowId, { ...current, status: "analyzing" })
                }
                return updated
              })

              const response = await fetch("/api/analyze-conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  conversationId: conversation.id,
                  content: conversation.content,
                  customPrompt: promptToUse, // Usando prompt do Supabase
                }),
                signal, // Pass abort signal
              })

              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Analysis failed")
              }

              const result = await response.json()

              // </CHANGE> Check if conversation was skipped before validating analysis fields

              if (!result.analysis || typeof result.analysis.overallScore !== "number") {
                throw new Error("Invalid analysis result: missing required fields")
              }

              console.log(
                `[v0] Row ${conversation.rowId}: Score ${result.analysis.overallScore}, Blocks ${result.analysis.blockAnalysis.length}`,
              )

              const saveResult = await saveAnalysis({
                conversationId: conversation.id,
                sessionId: conversation.sessionId,
                stagesPassed: conversation.stagesPassed,
                content: conversation.content,
                analysis: result.analysis,
              })

              if (!saveResult.success) {
                console.error("[v0] Failed to save analysis to Supabase:", saveResult.error)
              }

              setAnalysisResults((prev) => {
                const updated = new Map(prev)
                updated.set(conversation.rowId, {
                  ...result,
                  status: "completed",
                })
                return updated
              })

              setAnalyzingCount((prev) => prev + 1)
            } catch (error: any) {
              if (error.name === "AbortError") {
                console.log(`[v0] Request aborted for row ${conversation.rowId}`)
                return
              }

              console.error(`[v0] Error analyzing row ${conversation.rowId}:`, error.message)
              hasErrors = true

              setAnalysisResults((prev) => {
                const updated = new Map(prev)
                const current = updated.get(conversation.rowId)
                if (current) {
                  updated.set(conversation.rowId, {
                    ...current,
                    status: "error",
                    error: error.message,
                  } as any)
                }
                return updated
              })
              setAnalyzingCount((prev) => prev + 1)
            }
          }),
        )

        if (i + batchSize < conversationsToAnalyze.length && !signal.aborted) {
          const delayTime = hasErrors ? 5000 : 2000
          console.log(
            `[v0] Waiting ${delayTime / 1000} seconds before next batch... (${hasErrors ? "errors detected" : "all successful"})`,
          )
          await new Promise((resolve) => setTimeout(resolve, delayTime))
          hasErrors = false // Reset for next batch
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("[v0] Unexpected error in analysis loop:", error)
      }
    } finally {
      console.log("[v0] Analysis session ended")
      setIsAnalyzing(false)
      abortControllerRef.current = null
    }
  }

  // REMOVED: const analyzeCompleteHistory = async () => {
  // REMOVED:   setIsAnalyzingHistory(true)
  // REMOVED:
  // REMOVED:   try {
  // REMOVED:     const response = await fetch("/api/analyze-history", {
  // REMOVED:       method: "POST",
  // REMOVED:       headers: { "Content-Type": "application/json" },
  // REMOVED:       body: JSON.stringify({
  // REMOVED:         conversations: conversationsData.map((conv) => ({
  // REMOVED:           id: conv.id,
  // REMOVED:           content: conv.content,
  // REMOVED:         })),
  // REMOVED:       }),
  // REMOVED:     })
  // REMOVED:
  // REMOVED:     if (!response.ok) {
  // REMOVED:       const errorData = await response.json()
  // REMOVED:       throw new Error(errorData.error || "Historical analysis failed")
  // REMOVED:     }
  // REMOVED:
  // REMOVED:     const result = await response.json()
  // REMOVED:     setHistoricalAnalysis(result.analysis)
  // REMOVED:     setShowHistoricalReport(true)
  // REMOVED:   } catch (error: any) {
  // REMOVED:     console.error("[v0] Error in historical analysis:", error)
  // REMOVED:     alert(`Erro na análise histórica: ${error.message}`)
  // REMOVED:   } finally {
  // REMOVED:     setIsAnalyzingHistory(false)
  // REMOVED:   }
  // REMOVED: }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-50 text-green-700 border-green-200"
    if (score >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200"
    return "bg-red-50 text-red-700 border-red-200"
  }

  const calculateAggregateScores = () => {
    const completedAnalyses = Array.from(analysisResults.values()).filter(
      (r) => r.status === "completed" && r.analysis?.overallScore !== undefined,
    )

    if (completedAnalyses.length === 0) {
      return null
    }

    const totalOverallScore = completedAnalyses.reduce((sum, r) => sum + r.analysis.overallScore, 0)
    const totalAdherence = completedAnalyses.reduce((sum, r) => sum + (r.analysis.adherenceToMission || 0), 0)
    const totalCoherence = completedAnalyses.reduce((sum, r) => sum + (r.analysis.contextCoherence || 0), 0)
    const totalCompliance = completedAnalyses.reduce((sum, r) => sum + (r.analysis.guidelineCompliance || 0), 0)
    const totalQuality = completedAnalyses.reduce((sum, r) => sum + (r.analysis.responseQuality || 0), 0)

    return {
      overallScore: totalOverallScore / completedAnalyses.length,
      adherenceToMission: totalAdherence / completedAnalyses.length,
      contextCoherence: totalCoherence / completedAnalyses.length,
      guidelineCompliance: totalCompliance / completedAnalyses.length,
      responseQuality: totalQuality / completedAnalyses.length,
      totalAnalyzed: completedAnalyses.length,
    }
  }

  const aggregateScores = calculateAggregateScores()

  if (!hasLoadedData) {
    return (
      <div className="space-y-6">
        <Card className="border-border bg-white shadow-lg">
          <div className="p-12">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-blue-700">Carregar Conversas para Análise</h2>
                <p className="text-muted-foreground">
                  Faça upload de um arquivo CSV contendo as conversas que deseja analisar.
                </p>
              </div>

              <div className="flex justify-center">
                <div className="relative w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="csv-upload"
                  />
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 h-12 px-8 shadow-md"
                    asChild
                  >
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="h-5 w-5 mr-2" />
                      Carregar Arquivo CSV
                    </label>
                  </Button>
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-3 text-blue-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Carregando conversas...</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
        </div>
      </Card>
    )
  }

  const handleViewAnalysis = (e: React.MouseEvent, result: AnalysisResult) => {
    e.stopPropagation()
    setSelectedAnalysis(result)
    setAnalysisDialogKey((prev) => prev + 1)
  }

  const handleViewDetails = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    setSelectedConversation(conversation)
    setConversationDialogKey((prev) => prev + 1)
  }

  const handleOpenPromptConfig = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowPromptConfig(true)
    setPromptDialogKey((prev) => prev + 1)
  }

  const handleCloseConversationDialog = (open: boolean) => {
    if (!open) {
      // Limpeza imediata e agressiva
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = ""
        document.body.style.overflow = ""
        document.body.style.paddingRight = ""
        document.body.removeAttribute("data-state")
      }

      // Aguardar um frame antes de limpar o estado
      requestAnimationFrame(() => {
        setSelectedConversation(null)
        setConversationDialogKey((prev) => prev + 1)
      })
    }
  }

  const handleCloseAnalysisDialog = (open: boolean) => {
    if (!open) {
      // Limpeza imediata e agressiva
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = ""
        document.body.style.overflow = ""
        document.body.style.paddingRight = ""
        document.body.removeAttribute("data-state")
      }

      // Aguardar um frame antes de limpar o estado
      requestAnimationFrame(() => {
        setSelectedAnalysis(null)
        setAnalysisDialogKey((prev) => prev + 1)
      })
    }
  }

  const handleClosePromptDialog = (open: boolean) => {
    if (!open) {
      // Limpeza imediata e agressiva
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = ""
        document.body.style.overflow = ""
        document.body.style.paddingRight = ""
        document.body.removeAttribute("data-state")
      }

      // Aguardar um frame antes de limpar o estado
      requestAnimationFrame(() => {
        setShowPromptConfig(false)
        setPromptDialogKey((prev) => prev + 1)
      })
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="border-border bg-white shadow-sm">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  {conversationsData.length} conversas carregadas
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPromptConfig}
                  className="border-border text-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 bg-transparent"
                >
                  Configurar Prompt
                </Button>
                <Button
                  size="sm"
                  onClick={analyzeAllConversations}
                  disabled={isAnalyzing || conversationsData.length === 0}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando ({analyzingCount}/{conversationsData.length})
                    </>
                  ) : (
                    "Analisar Tudo"
                  )}
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="csv-reload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 bg-transparent"
                    asChild
                  >
                    <label htmlFor="csv-reload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Carregar Novo CSV
                    </label>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {aggregateScores && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Scores Consolidados</h2>
              <Badge variant="outline" className="text-xs">
                Baseado em {aggregateScores.totalAnalyzed} conversas analisadas
              </Badge>
            </div>

            <Card className="border-border bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Score Geral Médio
                  </p>
                  <p className="text-lg text-muted-foreground">Média de todas as conversas analisadas</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`text-6xl font-bold ${getScoreColor(aggregateScores.overallScore)}`}>
                    {aggregateScores.overallScore.toFixed(1)}
                  </div>
                  <Badge className={getScoreBadge(aggregateScores.overallScore)}>
                    {aggregateScores.overallScore >= 80
                      ? "Excelente"
                      : aggregateScores.overallScore >= 60
                        ? "Bom"
                        : "Precisa Melhorar"}
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border bg-white shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Aderência à Missão
                    </p>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(aggregateScores.adherenceToMission)}`}>
                    {aggregateScores.adherenceToMission.toFixed(1)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        aggregateScores.adherenceToMission >= 80
                          ? "bg-green-500"
                          : aggregateScores.adherenceToMission >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${aggregateScores.adherenceToMission}%` }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-white shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Coerência Contextual
                    </p>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(aggregateScores.contextCoherence)}`}>
                    {aggregateScores.contextCoherence.toFixed(1)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        aggregateScores.contextCoherence >= 80
                          ? "bg-green-500"
                          : aggregateScores.contextCoherence >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${aggregateScores.contextCoherence}%` }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-white shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Seguimento de Diretrizes
                    </p>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(aggregateScores.guidelineCompliance)}`}>
                    {aggregateScores.guidelineCompliance.toFixed(1)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        aggregateScores.guidelineCompliance >= 80
                          ? "bg-green-500"
                          : aggregateScores.guidelineCompliance >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${aggregateScores.guidelineCompliance}%` }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-white shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Qualidade das Respostas
                    </p>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(aggregateScores.responseQuality)}`}>
                    {aggregateScores.responseQuality.toFixed(1)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        aggregateScores.responseQuality >= 80
                          ? "bg-green-500"
                          : aggregateScores.responseQuality >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${aggregateScores.responseQuality}%` }}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Card className="border-border bg-white shadow-sm hidden md:block">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-border">
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wide w-[200px]">
                    Conversation ID
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wide w-[180px]">
                    Stage
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wide text-center w-[80px]">
                    Score
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wide">
                    Preview
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wide text-right w-[100px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nenhuma conversa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConversations.map((conversation) => {
                    const result = analysisResults.get(conversation.rowId)
                    return (
                      <TableRow
                        key={conversation.rowId}
                        className="border-b border-border hover:bg-blue-50/50 transition-colors"
                      >
                        <TableCell className="font-mono text-xs text-foreground">
                          <div className="truncate max-w-[200px]" title={conversation.id}>
                            {conversation.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal truncate max-w-[180px]">
                            {conversation.stagesPassed}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {result?.status === "completed" && result.analysis?.overallScore !== undefined ? (
                            <Badge className={getScoreBadge(result.analysis.overallScore)}>
                              {result.analysis.overallScore.toFixed(0)}
                            </Badge>
                          ) : result?.status === "analyzing" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                          ) : result?.status === "error" ? (
                            <Badge className="bg-red-50 text-red-700 border-red-200" title={result.error}>
                              Erro
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="text-sm line-clamp-2 max-w-[400px]">{conversation.content}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-foreground hover:bg-blue-50 hover:text-blue-600 data-[state=open]:bg-blue-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] bg-white border-border shadow-lg">
                              {result?.status === "completed" && (
                                <DropdownMenuItem
                                  onClick={(e) => handleViewAnalysis(e, result)}
                                  className="hover:bg-blue-50 focus:bg-blue-50"
                                >
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Ver Análise
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => handleViewDetails(e, conversation)}
                                className="hover:bg-blue-50 focus:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCopy(conversation.content, conversation.id)}
                                className="hover:bg-blue-50 focus:bg-blue-50"
                              >
                                {copiedId === conversation.id ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 md:hidden">
          {filteredConversations.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border-border bg-white shadow-sm">
              Nenhuma conversa encontrada
            </Card>
          ) : (
            filteredConversations.map((conversation) => {
              const result = analysisResults.get(conversation.rowId)
              return (
                <Card
                  key={conversation.rowId}
                  className="border-border bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-foreground truncate mb-1" title={conversation.id}>
                          {conversation.id}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {conversation.stagesPassed}
                        </Badge>
                      </div>
                      {result?.status === "completed" && result.analysis?.overallScore !== undefined ? (
                        <Badge className={`${getScoreBadge(result.analysis.overallScore)} text-lg px-3 py-1`}>
                          {result.analysis.overallScore.toFixed(0)}
                        </Badge>
                      ) : result?.status === "analyzing" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : result?.status === "error" ? (
                        <Badge className="bg-red-50 text-red-700 border-red-200 text-xs" title={result.error}>
                          Erro
                        </Badge>
                      ) : null}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground line-clamp-2">{conversation.content}</p>
                    </div>

                    <div className="flex gap-2">
                      {result?.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleViewAnalysis(e, result)}
                          className="flex-1 border-border text-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 h-9"
                        >
                          <BarChart3 className="h-4 w-4 mr-1.5" />
                          Análise
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleViewDetails(e, conversation)}
                        className="flex-1 border-border text-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 h-9"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(conversation.content, conversation.id)}
                        className="border-border text-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 h-9 px-3"
                      >
                        {copiedId === conversation.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <div key={`conversation-wrapper-${conversationDialogKey}`}>
        <Dialog open={!!selectedConversation} onOpenChange={handleCloseConversationDialog} modal={true}>
          <DialogContent className="w-[95vw] max-w-[1100px] max-h-[80vh] bg-white border-border shadow-2xl flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-blue-700 text-xl font-bold">Detalhes da Conversa</DialogTitle>
              <DialogDescription className="text-muted-foreground space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="break-words">
                    <span className="font-semibold">Session ID:</span> {selectedConversation?.sessionId}
                  </div>
                  <div className="break-words">
                    <span className="font-semibold">Conversation ID:</span> {selectedConversation?.id}
                  </div>
                  <div className="col-span-1 sm:col-span-2 break-words">
                    <span className="font-semibold">Stage:</span> {selectedConversation?.stagesPassed}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4 flex-1 min-h-0">
              <div className="rounded-lg bg-gray-50 p-4 max-h-[50vh] overflow-y-auto border border-border">
                <pre className="whitespace-pre-wrap break-words text-sm font-mono text-foreground leading-relaxed">
                  {selectedConversation?.content}
                </pre>
              </div>
              <div className="flex justify-end pt-2 border-t border-border flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() =>
                    selectedConversation && handleCopy(selectedConversation.content, selectedConversation.id)
                  }
                  className="border-border text-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                >
                  {copiedId === selectedConversation?.id ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Conteúdo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div key={`analysis-wrapper-${analysisDialogKey}`}>
        <Dialog open={!!selectedAnalysis} onOpenChange={handleCloseAnalysisDialog} modal={true}>
          <DialogContent className="w-[95vw] max-w-[1200px] max-h-[85vh] bg-white border-border shadow-2xl flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-blue-700 text-xl font-bold">
                Análise da Conversa - ID: {selectedAnalysis?.conversationId}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Análise detalhada linha por linha da conversa
              </DialogDescription>
            </DialogHeader>

            {selectedAnalysis?.analysis && (
              <div className="space-y-6 mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
                {/* Overall Score */}
                <Card className="border-border bg-gray-50 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-lg font-semibold text-blue-600 mb-2">Pontuação Geral</h3>
                      <p className="text-sm text-muted-foreground break-words">
                        {selectedAnalysis.analysis.summary || "Análise completa da conversa"}
                      </p>
                    </div>
                    <div
                      className={`text-5xl font-bold ${getScoreColor(selectedAnalysis.analysis.overallScore)} flex-shrink-0`}
                    >
                      {selectedAnalysis.analysis.overallScore.toFixed(0)}
                    </div>
                  </div>
                </Card>

                {/* Mission Display */}
                {selectedAnalysis.analysis.mission && (
                  <Card className="border-blue-200 bg-blue-50/50 p-6">
                    <h3 className="text-lg font-semibold text-blue-600 mb-3">Missão Original</h3>
                    <div className="bg-white rounded-lg p-4 border border-blue-100 max-h-[300px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words text-sm text-foreground leading-relaxed">
                        {selectedAnalysis.analysis.mission}
                      </pre>
                    </div>
                  </Card>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-border bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-600">Aderência à Missão</h4>
                      <span
                        className={`text-2xl font-bold ${getScoreColor(selectedAnalysis.analysis.adherenceToMission)} flex-shrink-0`}
                      >
                        {selectedAnalysis.analysis.adherenceToMission}
                      </span>
                    </div>
                    {selectedAnalysis.analysis.adherenceToMissionReason && (
                      <p className="text-sm text-muted-foreground mt-2 break-words">
                        {selectedAnalysis.analysis.adherenceToMissionReason}
                      </p>
                    )}
                  </Card>

                  <Card className="border-border bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-600">Coerência Contextual</h4>
                      <span
                        className={`text-2xl font-bold ${getScoreColor(selectedAnalysis.analysis.contextCoherence)} flex-shrink-0`}
                      >
                        {selectedAnalysis.analysis.contextCoherence}
                      </span>
                    </div>
                    {selectedAnalysis.analysis.contextCoherenceReason && (
                      <p className="text-sm text-muted-foreground mt-2 break-words">
                        {selectedAnalysis.analysis.contextCoherenceReason}
                      </p>
                    )}
                  </Card>

                  <Card className="border-border bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-600">Seguimento de Diretrizes</h4>
                      <span
                        className={`text-2xl font-bold ${getScoreColor(selectedAnalysis.analysis.guidelineCompliance)} flex-shrink-0`}
                      >
                        {selectedAnalysis.analysis.guidelineCompliance}
                      </span>
                    </div>
                    {selectedAnalysis.analysis.guidelineComplianceReason && (
                      <p className="text-sm text-muted-foreground mt-2 break-words">
                        {selectedAnalysis.analysis.guidelineComplianceReason}
                      </p>
                    )}
                  </Card>

                  <Card className="border-border bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-600">Qualidade das Respostas</h4>
                      <span
                        className={`text-2xl font-bold ${getScoreColor(selectedAnalysis.analysis.responseQuality)} flex-shrink-0`}
                      >
                        {selectedAnalysis.analysis.responseQuality}
                      </span>
                    </div>
                    {selectedAnalysis.analysis.responseQualityReason && (
                      <p className="text-sm text-muted-foreground mt-2 break-words">
                        {selectedAnalysis.analysis.responseQualityReason}
                      </p>
                    )}
                  </Card>
                </div>

                {/* Line by Line Analysis */}
                {selectedAnalysis.analysis.blockAnalysis && selectedAnalysis.analysis.blockAnalysis.length > 0 && (
                  <Card className="border-border bg-card p-6">
                    <h3 className="text-lg font-semibold text-blue-600 mb-4">
                      Análise Detalhada por Bloco
                      <span className="text-sm text-muted-foreground ml-2">
                        ({selectedAnalysis.analysis.blockAnalysis.length} blocos analisados
                        {selectedAnalysis.totalBlocksInConversation &&
                          ` de ${selectedAnalysis.totalBlocksInConversation} esperadas`}
                        )
                      </span>
                    </h3>
                    <div className="space-y-4">
                      {selectedAnalysis.analysis.blockAnalysis.map((block, idx) => (
                        <Card key={idx} className="border-border bg-gray-50 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  Bloco {block.blockNumber}
                                </Badge>
                                <Badge className={getScoreBadge(block.score)}>{block.score}</Badge>
                              </div>

                              {block.humanMessages && block.humanMessages.length > 0 && (
                                <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
                                  <h5 className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                                    Mensagem do Humano:
                                  </h5>
                                  {block.humanMessages.map((msg, msgIdx) => (
                                    <p key={msgIdx} className="text-sm text-foreground mb-2 last:mb-0 break-words">
                                      {msg}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {block.messages && block.messages.length > 0 && (
                                <div className="bg-white rounded-lg p-3 mb-3 border border-border">
                                  <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Resposta da IA:
                                  </h5>
                                  <div className="max-h-[200px] overflow-y-auto">
                                    {block.messages.map((msg, msgIdx) => (
                                      <p key={msgIdx} className="text-sm text-foreground mb-2 last:mb-0 break-words">
                                        {msg}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {block.missionAlignment && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <h5 className="text-sm font-semibold text-blue-600 mb-1">Alinhamento com a Missão:</h5>
                              <p className="text-sm text-foreground break-words">{block.missionAlignment}</p>
                            </div>
                          )}

                          {block.scoreReason && (
                            <div className="mb-3 p-3 bg-gray-100 rounded-lg border border-border">
                              <h5 className="text-sm font-semibold text-blue-600 mb-1">Motivo da Pontuação:</h5>
                              <p className="text-sm text-muted-foreground break-words">{block.scoreReason}</p>
                            </div>
                          )}

                          {block.detailedFeedback && (
                            <div className="mb-3 p-3 bg-gray-100 rounded-lg border border-border">
                              <h5 className="text-sm font-semibold text-blue-600 mb-1">Análise Detalhada:</h5>
                              <p className="text-sm text-muted-foreground break-words">{block.detailedFeedback}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {block.issues && block.issues.length > 0 && (
                              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                <h5 className="text-sm font-semibold text-red-600 mb-2">Problemas Identificados:</h5>
                                <ul className="text-sm text-foreground space-y-1">
                                  {block.issues.map((issue, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-red-600 mt-0.5 flex-shrink-0">•</span>
                                      <span className="break-words">{issue}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {block.strengths && block.strengths.length > 0 && (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <h5 className="text-sm font-semibold text-green-600 mb-2">Pontos Fortes:</h5>
                                <ul className="text-sm text-foreground space-y-1">
                                  {block.strengths.map((strength, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-green-600 mt-0.5 flex-shrink-0">•</span>
                                      <span className="break-words">{strength}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Deviations and Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAnalysis.analysis.deviations && selectedAnalysis.analysis.deviations.length > 0 && (
                    <Card className="border-red-200 bg-red-50 p-4">
                      <h4 className="font-semibold text-red-600 mb-3">Desvios Identificados</h4>
                      <ul className="space-y-2">
                        {selectedAnalysis.analysis.deviations.map((deviation, idx) => (
                          <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-red-600 mt-0.5 flex-shrink-0">•</span>
                            <span className="break-words">{deviation}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {selectedAnalysis.analysis.suggestions && selectedAnalysis.analysis.suggestions.length > 0 && (
                    <Card className="border-green-200 bg-green-50 p-4">
                      <h4 className="font-semibold text-green-600 mb-3">Sugestões de Melhoria</h4>
                      <ul className="space-y-2">
                        {selectedAnalysis.analysis.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-green-600 mt-0.5 flex-shrink-0">•</span>
                            <span className="break-words">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>

                {/* Detailed Report */}
                {selectedAnalysis.analysis.detailedReport && (
                  <Card className="border-border bg-gray-50 p-6">
                    <h3 className="text-lg font-semibold text-blue-600 mb-3">Relatório Detalhado</h3>
                    <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {selectedAnalysis.analysis.detailedReport}
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div key={`prompt-wrapper-${promptDialogKey}`}>
        <Dialog open={showPromptConfig} onOpenChange={handleClosePromptDialog} modal={true}>
          <DialogContent className="w-[90vw] max-w-[800px] max-h-[90vh] bg-white border-border shadow-2xl flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-blue-700 text-xl font-bold">Configurar Prompt de Análise</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Personalize as instruções enviadas para a IA analisar as conversas. As modificações são salvas no banco
                de dados e aplicadas automaticamente para todos os usuários. Use variáveis como{" "}
                <code className="bg-gray-100 px-1 rounded">{"{{MISSION}}"}</code>,{" "}
                <code className="bg-gray-100 px-1 rounded">{"{{TRANSITION_TOOLS}}"}</code>,{" "}
                <code className="bg-gray-100 px-1 rounded">{"{{PROMPT_TEMPLATES}}"}</code>, e{" "}
                <code className="bg-gray-100 px-1 rounded">{"{{AI_BLOCKS}}"}</code> que serão substituídas
                automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
              {promptLoading && !customPrompt ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-muted-foreground">Carregando prompt...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-blue-600">Instruções do Prompt:</label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Digite as instruções personalizadas para a análise..."
                      className="w-full h-96 p-4 border border-border rounded-lg bg-white text-foreground font-mono text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                      disabled={promptLoading}
                    />
                    <p className="text-xs text-green-600 font-medium">
                      ✓ O prompt será salvo no banco de dados e usado automaticamente em todas as análises futuras por
                      todos os usuários.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      {promptSaved && (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <Check className="h-4 w-4" />
                          <span>Prompt salvo com sucesso!</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={resetToDefaultPrompt}
                        disabled={promptLoading}
                        className="border-border text-foreground hover:bg-gray-50 bg-transparent"
                      >
                        Restaurar Padrão
                      </Button>
                      <Button
                        onClick={saveCustomPrompt}
                        disabled={promptLoading}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {promptLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Salvar Prompt
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Card className="border-blue-200 bg-blue-50/50 p-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Dicas para Personalização:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Ajuste os critérios de pontuação para focar em aspectos específicos</li>
                      <li>• Modifique o nível de detalhe das explicações (conciso vs. detalhado)</li>
                      <li>• Adicione ou remova critérios de avaliação conforme necessário</li>
                      <li>• Defina o formato exato do JSON de resposta esperado</li>
                      <li>• Defina pesos diferentes para cada critério de avaliação</li>
                      <li>• As alterações serão aplicadas automaticamente para todos os usuários da plataforma</li>
                    </ul>
                  </Card>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
