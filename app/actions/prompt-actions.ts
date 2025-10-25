"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const DEFAULT_PROMPT = `Você é um auditor especializado em análise de qualidade de conversas de agentes de IA para vendas e qualificação de clientes. Sua missão é avaliar rigorosamente cada interação, identificando pontos fortes, falhas e oportunidades de melhoria.

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
  "responseQualityReason": "<explicação detalhada da pontuação deste bloco>",
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
- **Priorize a missão** - o seguimento da missão é o critério mais importante
- **Identifique tendências** - melhorias ou pioras ao longo da conversa
- **Seja construtivo** - críticas devem vir acompanhadas de sugestões
- **Mantenha objetividade** - baseie-se em fatos, não em impressões subjetivas
- **Considere o contexto** - Avalie se a informação da resposta da IA está no contexto

Agora analise a conversa fornecida e retorne o JSON com sua avaliação completa.`

export async function getPrompt() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("analysis_prompts").select("prompt_text").eq("id", 1).single()

    if (error) {
      console.error("[v0] Error fetching prompt from Supabase:", error)
      return { success: false, prompt: DEFAULT_PROMPT, source: "default" }
    }

    return { success: true, prompt: data.prompt_text, source: "database" }
  } catch (error) {
    console.error("[v0] Exception fetching prompt:", error)
    return { success: false, prompt: DEFAULT_PROMPT, source: "default" }
  }
}

export async function savePrompt(promptText: string) {
  try {
    console.log("[v0] ===== SAVE PROMPT SERVER ACTION CALLED =====")
    console.log("[v0] Received promptText length:", promptText.length)
    console.log("[v0] Received promptText first 100 chars:", promptText.substring(0, 100))
    console.log("[v0] Received promptText last 100 chars:", promptText.substring(promptText.length - 100))

    const supabase = await createClient()
    console.log("[v0] Supabase client created successfully")

    console.log("[v0] Checking if row with id=1 exists...")
    const { data: existing, error: checkError } = await supabase
      .from("analysis_prompts")
      .select("id")
      .eq("id", 1)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[v0] Error checking existing prompt:", checkError)
      return { success: false, error: checkError.message }
    }

    if (!existing) {
      console.log("[v0] No existing prompt found, inserting new one")
      const { error: insertError } = await supabase.from("analysis_prompts").insert({ id: 1, prompt_text: promptText })

      if (insertError) {
        console.error("[v0] Error inserting prompt:", insertError)
        return { success: false, error: insertError.message }
      }

      console.log("[v0] Prompt inserted successfully")
      console.log("[v0] Inserted prompt first 100 chars:", promptText.substring(0, 100))

      revalidatePath("/")
      return { success: true }
    }

    console.log("[v0] Existing prompt found, updating...")
    const { error: updateError } = await supabase
      .from("analysis_prompts")
      .update({
        prompt_text: promptText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    if (updateError) {
      console.error("[v0] Error updating prompt:", updateError)
      return { success: false, error: updateError.message }
    }

    console.log("[v0] Prompt updated successfully!")
    console.log("[v0] Updated prompt first 100 chars:", promptText.substring(0, 100))

    revalidatePath("/")

    return { success: true }
  } catch (error: any) {
    console.error("[v0] ===== EXCEPTION IN SAVE PROMPT =====")
    console.error("[v0] Exception:", error)
    console.error("[v0] Exception message:", error.message)
    console.error("[v0] Exception stack:", error.stack)
    return { success: false, error: error.message }
  }
}
