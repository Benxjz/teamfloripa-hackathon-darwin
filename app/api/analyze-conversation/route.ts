export const maxDuration = 180

function parseConversationLines(content: string): Array<{ lineNumber: number; speaker: string; message: string }> {
  const lines: Array<{ lineNumber: number; speaker: string; message: string }> = []
  const conversationMatch = content.match(/🧠 CONVERSATION HISTORY[^:]*:([\s\S]*?)(?:IMPORTANT:|$)/)

  if (!conversationMatch) {
    console.log("[v0] No conversation history found in content")
    return lines
  }

  const conversationText = conversationMatch[1]
  console.log("[v0] Conversation text extracted, length:", conversationText.length)

  const messagePattern = /(human|ai):\s*([^\n]+(?:\n(?!(?:human|ai):)[^\n]+)*)/gi
  let match
  let lineNumber = 0

  while ((match = messagePattern.exec(conversationText)) !== null) {
    const speaker = match[1].toLowerCase()
    const message = match[2].trim()

    if (message) {
      lineNumber++
      lines.push({ lineNumber, speaker, message })
    }
  }

  console.log("[v0] Parsed", lines.length, "conversation lines")
  return lines
}

function groupAIMessageBlocks(
  content: string,
): Array<{ blockNumber: number; messages: string[]; humanMessages: string[] }> {
  const blocks: Array<{ blockNumber: number; messages: string[]; humanMessages: string[] }> = []
  const conversationMatch = content.match(/🧠 CONVERSATION HISTORY[^:]*:([\s\S]*?)(?:IMPORTANT:|$)/)

  if (!conversationMatch) {
    console.log("[v0] No conversation history found in content")
    return blocks
  }

  const conversationText = conversationMatch[1]
  console.log("[v0] Conversation text extracted for grouping, length:", conversationText.length)

  const messagePattern = /(human|ai):\s*([^\n]+(?:\n(?!(?:human|ai):)[^\n]+)*)/gi
  let match
  let currentAIBlock: string[] = []
  let currentHumanMessages: string[] = []
  let blockNumber = 0

  while ((match = messagePattern.exec(conversationText)) !== null) {
    const speaker = match[1].toLowerCase()
    const message = match[2].trim()

    if (speaker === "human" && message) {
      // Collect human messages
      currentHumanMessages.push(message)
    } else if (speaker === "ai" && message) {
      // Add to current AI block
      currentAIBlock.push(message)
    }

    // When we encounter a human message after AI messages, save the block
    if (speaker === "human" && currentAIBlock.length > 0) {
      blockNumber++
      blocks.push({
        blockNumber,
        messages: [...currentAIBlock],
        humanMessages: [...currentHumanMessages], // Human messages for this block were already collected before
      })
      currentAIBlock = []
      // Keep the current human message for the next block
      currentHumanMessages = [message]
    }
  }

  // Save last block if exists
  if (currentAIBlock.length > 0) {
    blockNumber++
    blocks.push({
      blockNumber,
      messages: [...currentAIBlock],
      humanMessages: [...currentHumanMessages],
    })
  }

  // Now we need to properly associate human messages with their following AI blocks
  // Re-parse to get the correct association
  const allMessages: Array<{ speaker: string; message: string }> = []
  messagePattern.lastIndex = 0
  while ((match = messagePattern.exec(conversationText)) !== null) {
    const speaker = match[1].toLowerCase()
    const message = match[2].trim()
    if (message) {
      allMessages.push({ speaker, message })
    }
  }

  // Rebuild blocks with correct human message associations
  const rebuiltBlocks: Array<{ blockNumber: number; messages: string[]; humanMessages: string[] }> = []
  let currentBlock: string[] = []
  let precedingHumanMsgs: string[] = []
  let blockNum = 0

  for (const msg of allMessages) {
    if (msg.speaker === "human") {
      // If we have an AI block in progress, save it first
      if (currentBlock.length > 0) {
        blockNum++
        rebuiltBlocks.push({
          blockNumber: blockNum,
          messages: [...currentBlock],
          humanMessages: [...precedingHumanMsgs],
        })
        currentBlock = []
        precedingHumanMsgs = []
      }
      // Add this human message to the collection
      precedingHumanMsgs.push(msg.message)
    } else if (msg.speaker === "ai") {
      // Add AI message to current block
      currentBlock.push(msg.message)
    }
  }

  // Save final block if exists
  if (currentBlock.length > 0) {
    blockNum++
    rebuiltBlocks.push({
      blockNumber: blockNum,
      messages: [...currentBlock],
      humanMessages: [...precedingHumanMsgs],
    })
  }

  console.log("[v0] Grouped into", rebuiltBlocks.length, "AI message blocks with human context")
  return rebuiltBlocks
}

function extractMission(content: string): string {
  const missionMatch = content.match(/<mission>([\s\S]*?)<\/mission>/)
  if (missionMatch) {
    return missionMatch[1].trim()
  }
  return "Missão não encontrada no conteúdo"
}

function extractTransitionTools(content: string): string {
  const transitionMatch = content.match(/<transition_tools>([\s\S]*?)<\/transition_tools>/)
  if (transitionMatch) {
    return transitionMatch[1].trim()
  }
  // Try alternative patterns
  const altMatch = content.match(/TRANSITION TOOLS[:\s]*([\s\S]*?)(?:<\/|PROMPT TEMPLATES|🧠 CONVERSATION|$)/i)
  if (altMatch) {
    return altMatch[1].trim()
  }
  return ""
}

function extractPromptTemplates(content: string): string {
  const templateMatch = content.match(/<prompt_templates>([\s\S]*?)<\/prompt_templates>/)
  if (templateMatch) {
    return templateMatch[1].trim()
  }
  // Try alternative patterns
  const altMatch = content.match(/PROMPT TEMPLATES[:\s]*([\s\S]*?)(?:<\/|🧠 CONVERSATION|$)/i)
  if (altMatch) {
    return altMatch[1].trim()
  }
  return ""
}

export async function POST(req: Request) {
  try {
    const { conversationId, content, customPrompt } = await req.json()

    console.log(`[v0] Analyzing conversation ${conversationId}`)
    console.log(`[v0] Content length: ${content.length}`)
    console.log(`[v0] Custom prompt provided: ${!!customPrompt}`)

    if (customPrompt) {
      console.log(`[v0] Custom prompt length: ${customPrompt.length}`)
      console.log(`[v0] Custom prompt first 200 chars: ${customPrompt.substring(0, 200)}`)
      console.log(`[v0] Custom prompt last 200 chars: ${customPrompt.substring(customPrompt.length - 200)}`)
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.error("[v0] OPENAI_API_KEY not found in environment variables")
      return Response.json(
        {
          error:
            "OPENAI_API_KEY não configurada. Por favor, adicione sua API key do OpenAI nas variáveis de ambiente do projeto.",
        },
        { status: 400 },
      )
    }

    console.log("[v0] API Key found:", apiKey.substring(0, 10) + "...")

    const mission = extractMission(content)
    const transitionTools = extractTransitionTools(content)
    const promptTemplates = extractPromptTemplates(content)
    const aiBlocks = groupAIMessageBlocks(content)

    console.log(`[v0] Mission extracted: ${mission.substring(0, 100)}...`)
    console.log(
      `[v0] Transition tools extracted: ${transitionTools ? transitionTools.substring(0, 100) + "..." : "Not found"}`,
    )
    console.log(
      `[v0] Prompt templates extracted: ${promptTemplates ? promptTemplates.substring(0, 100) + "..." : "Not found"}`,
    )
    console.log(`[v0] Grouped into ${aiBlocks.length} AI message blocks`)

    // For very large conversations (10+), we use ultra-simplified analysis to avoid timeouts
    const isLargeConversation = aiBlocks.length > 8
    const isVeryLarge = aiBlocks.length >= 10 // Changed from > 10 to >= 10

    const blocksForPrompt = aiBlocks
      .map((block) => {
        const humanContext =
          block.humanMessages.length > 0 ? `Contexto Humano:\n${block.humanMessages.join("\n")}\n\n` : ""
        const messagesText = block.messages.join("\n")
        return `Bloco ${block.blockNumber} (${block.messages.length} mensagem${block.messages.length > 1 ? "s" : ""}):\n${humanContext}Mensagens da IA:\n${messagesText}`
      })
      .join("\n\n")

    console.log(`[v0] Complete prompt length: ${blocksForPrompt.length}`)
    console.log(`[v0] Large conversation: ${isLargeConversation}`)
    console.log(`[v0] Very large conversation: ${isVeryLarge}`)

    let prompt: string

    if (customPrompt) {
      prompt = customPrompt
        .replace(/\{\{MISSION\}\}/g, mission)
        .replace(/\{\{PROMPT_TEMPLATES\}\}/g, promptTemplates || "Nenhum template de prompt configurado")
        .replace(/\{\{TRANSITION_TOOLS\}\}/g, transitionTools || "Nenhuma transition tool configurada")
        .replace(/\{\{AI_BLOCKS\}\}/g, blocksForPrompt)
        .replace(/\{\{CONVERSATION_BLOCKS\}\}/g, blocksForPrompt)

      console.log("[v0] Using CUSTOM prompt with placeholders replaced")
      console.log(`[v0] Final prompt length: ${prompt.length}`)
      console.log(`[v0] Final prompt first 300 chars: ${prompt.substring(0, 300)}`)
    } else if (isVeryLarge) {
      prompt = `Analise esta conversa de IA com ${aiBlocks.length} blocos de forma ULTRA RÁPIDA e CONCISA.

${blocksForPrompt}

Retorne JSON minimalista:
{
  "overallScore": 0-100,
  "mission": "missão",
  "adherenceToMission": 0-100,
  "adherenceToMissionReason": "1 frase",
  "contextCoherence": 0-100,
  "contextCoherenceReason": "1 frase",
  "guidelineCompliance": 0-100,
  "guidelineComplianceReason": "1 frase",
  "responseQuality": 0-100,
  "responseQualityReason": "1 frase",
  "blockAnalysis": [${aiBlocks.map((b) => `{"blockNumber":${b.blockNumber},"messageCount":${b.messages.length},"messages":[],"score":0-100,"scoreReason":"1 frase","missionAlignment":"ok/problema","issues":["max 1"],"strengths":["max 1"],"detailedFeedback":"1 frase"}`).join(",")}],
  "deviations": ["max 2"],
  "suggestions": ["max 2"],
  "summary": "2 frases",
  "detailedReport": "3 frases"
}

CRÍTICO: blockAnalysis DEVE ter EXATAMENTE ${aiBlocks.length} objetos. Seja EXTREMAMENTE CONCISO.`
    } else if (isLargeConversation) {
      prompt = `Analise esta conversa de IA com ${aiBlocks.length} blocos de forma CONCISA.

${blocksForPrompt}

Retorne JSON com campos: overallScore, mission, adherenceToMission, adherenceToMissionReason (breve), contextCoherence, contextCoherenceReason (breve), guidelineCompliance, guidelineComplianceReason (breve), responseQuality, responseQualityReason (breve), blockAnalysis (${aiBlocks.length} objetos com blockNumber, messageCount, messages, score, scoreReason breve, missionAlignment breve, issues max 2, strengths max 2, detailedFeedback breve), deviations (max 3), suggestions (max 3), summary (breve), detailedReport (breve).

CRÍTICO: blockAnalysis DEVE ter ${aiBlocks.length} objetos.`
    } else {
      const jsonStructure = `
{
  "overallScore": 0-100,
  "mission": "texto da missão",
  "adherenceToMission": 0-100,
  "adherenceToMissionReason": "explicação",
  "contextCoherence": 0-100,
  "contextCoherenceReason": "explicação",
  "guidelineCompliance": 0-100,
  "guidelineComplianceReason": "explicação",
  "responseQuality": 0-100,
  "responseQualityReason": "explicação",
  "blockAnalysis": [
    {
      "blockNumber": 1,
      "messageCount": 2,
      "messages": ["msg1", "msg2"],
      "score": 0-100,
      "scoreReason": "explicação",
      "missionAlignment": "texto",
      "issues": ["problema1"],
      "strengths": ["ponto forte1"],
      "detailedFeedback": "feedback"
    }
  ],
  "deviations": ["desvio1"],
  "suggestions": ["sugestão1"],
  "summary": "resumo",
  "detailedReport": "relatório"
}`

      prompt = `Você é um especialista em análise de qualidade de conversas de agentes de IA.

${blocksForPrompt}

Analise TODOS os ${aiBlocks.length} blocos de mensagens consecutivas da IA.

IMPORTANTE: Retorne EXATAMENTE este formato JSON com estes nomes de campos em inglês:
${jsonStructure}

Cada bloco em blockAnalysis DEVE ter:
- blockNumber: número do bloco (1 a ${aiBlocks.length})
- messageCount: quantidade de mensagens
- messages: array com as mensagens do bloco
- score: pontuação 0-100
- scoreReason: explicação detalhada
- missionAlignment: como se alinha com a missão
- issues: array de problemas identificados
- strengths: array de pontos fortes
- detailedFeedback: análise profunda do bloco

CRÍTICO: blockAnalysis DEVE ter EXATAMENTE ${aiBlocks.length} objetos, um para cada bloco.`
    }

    console.log("[v0] Calling OpenAI API...")
    console.log(`[v0] Using ${customPrompt ? "CUSTOM" : "DEFAULT"} prompt`)

    // For 15+ blocks with detailed analysis, we need 8000 tokens
    const maxTokens =
      aiBlocks.length >= 15
        ? 8000
        : aiBlocks.length >= 10
          ? 7000
          : aiBlocks.length >= 5
            ? 5000
            : aiBlocks.length >= 3
              ? 4000
              : 3000
    console.log(`[v0] Max completion tokens: ${maxTokens}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 second timeout

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an expert in conversation quality analysis. Return ONLY valid JSON with the EXACT field names specified in the prompt. Use English field names.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("[v0] OpenAI response status:", response.status)

      const responseText = await response.text()
      console.log("[v0] OpenAI response (first 500 chars):", responseText.substring(0, 500))

      if (!response.ok) {
        console.error("[v0] OpenAI API error response:", responseText)

        if (response.status === 401) {
          return Response.json(
            {
              error: "API key inválida ou não autorizada. Verifique se sua OPENAI_API_KEY está correta e ativa.",
            },
            { status: 401 },
          )
        }

        if (response.status === 429) {
          return Response.json(
            {
              error: "Limite de taxa excedido. Aguarde alguns minutos e tente novamente.",
            },
            { status: 429 },
          )
        }

        return Response.json(
          {
            error: `Erro da OpenAI API (${response.status}): ${responseText}`,
          },
          { status: response.status },
        )
      }

      if (responseText.includes("FUNCTION_INVOCATION_TIMEOUT") || responseText.includes("An error occurred")) {
        console.error("[v0] OpenAI timeout detected:", responseText)
        return Response.json(
          {
            error: `Timeout ao analisar conversa com ${aiBlocks.length} blocos. A conversa é muito longa. Tente novamente ou contate o suporte.`,
          },
          { status: 504 },
        )
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError: any) {
        console.error("[v0] Failed to parse OpenAI response as JSON:", parseError)
        console.error("[v0] Response text:", responseText)
        throw new Error(`OpenAI retornou resposta inválida: ${parseError.message}`)
      }

      console.log("[v0] OpenAI response parsed successfully")

      const finishReason = data.choices[0]?.finish_reason
      console.log("[v0] Finish reason:", finishReason)

      if (finishReason === "length") {
        console.error("[v0] Response was truncated due to max_tokens limit")
        return Response.json(
          {
            error: `A análise foi truncada porque a resposta era muito longa. Tente usar um prompt mais conciso ou contate o suporte.`,
          },
          { status: 413 },
        )
      }

      const aiResponse = data.choices[0]?.message?.content
      if (!aiResponse) {
        console.error("[v0] No content in OpenAI response:", data)
        throw new Error("OpenAI não retornou conteúdo")
      }

      console.log("[v0] AI response length:", aiResponse.length)

      let analysis
      try {
        let jsonText = aiResponse.trim()
        if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
        }

        console.log("[v0] JSON text length:", jsonText.length)
        console.log("[v0] JSON text first 300 chars:", jsonText.substring(0, 300))
        console.log("[v0] JSON text last 300 chars:", jsonText.substring(jsonText.length - 300))

        analysis = JSON.parse(jsonText)
        console.log("[v0] Analysis JSON parsed successfully")
      } catch (parseError: any) {
        console.error("[v0] Failed to parse analysis JSON:", parseError)
        console.error("[v0] Raw AI response (first 1000 chars):", aiResponse.substring(0, 1000))
        console.error("[v0] Raw AI response (last 1000 chars):", aiResponse.substring(aiResponse.length - 1000))

        if (parseError.message.includes("Unterminated string")) {
          return Response.json(
            {
              error: `A resposta da OpenAI foi cortada no meio. Isso geralmente acontece quando o prompt é muito longo ou complexo. Tente simplificar o prompt ou reduzir o tamanho da análise.`,
            },
            { status: 413 },
          )
        }

        throw new Error(`Failed to parse AI response: ${parseError.message}`)
      }

      const validatedAnalysis = {
        overallScore: Number(analysis.overallScore) || 0,
        mission: mission, // Use original extracted mission to ensure full text is displayed
        adherenceToMission: Number(analysis.adherenceToMission) || 0,
        adherenceToMissionReason: analysis.adherenceToMissionReason || "Sem explicação disponível",
        contextCoherence: Number(analysis.contextCoherence) || 0,
        contextCoherenceReason: analysis.contextCoherenceReason || "Sem explicação disponível",
        guidelineCompliance: Number(analysis.guidelineCompliance) || 0,
        guidelineComplianceReason: analysis.guidelineComplianceReason || "Sem explicação disponível",
        responseQuality: Number(analysis.responseQuality) || 0,
        responseQualityReason: analysis.responseQualityReason || "Sem explicação disponível",
        blockAnalysis: Array.isArray(analysis.blockAnalysis)
          ? analysis.blockAnalysis.map((block: any, idx: number) => ({
              blockNumber: block.blockNumber || aiBlocks[idx]?.blockNumber || idx + 1,
              messageCount: aiBlocks[idx]?.messages.length || 1, // Always use actual message count from CSV
              messages: aiBlocks[idx]?.messages || [], // ALWAYS use actual messages from CSV, never from OpenAI
              humanMessages: aiBlocks[idx]?.humanMessages || [], // ALWAYS use actual human messages from CSV
              score: Number(block.score) || 0,
              scoreReason: block.scoreReason || "Sem explicação disponível",
              missionAlignment: block.missionAlignment || "",
              issues: Array.isArray(block.issues) ? block.issues : [],
              strengths: Array.isArray(block.strengths) ? block.strengths : [],
              detailedFeedback: block.detailedFeedback || "",
            }))
          : [],
        deviations: Array.isArray(analysis.deviations) ? analysis.deviations : [],
        suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
        summary: analysis.summary || "Análise não disponível",
        detailedReport: analysis.detailedReport || "Relatório detalhado não disponível",
      }

      console.log("[v0] Analysis completed successfully")
      console.log(`[v0] Overall score: ${validatedAnalysis.overallScore}`)
      console.log(`[v0] Blocks analyzed: ${validatedAnalysis.blockAnalysis.length}`)
      console.log(`[v0] Expected blocks: ${aiBlocks.length}, Got: ${validatedAnalysis.blockAnalysis.length}`)

      return Response.json({
        conversationId,
        analysis: validatedAnalysis,
        timestamp: new Date().toISOString(),
        totalBlocksInConversation: aiBlocks.length,
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      if (fetchError.name === "AbortError") {
        console.error("[v0] Request timeout after 90 seconds")
        return Response.json(
          {
            error: `Timeout ao analisar conversa com ${aiBlocks.length} blocos. A análise demorou muito tempo. Tente simplificar o prompt ou contate o suporte.`,
          },
          { status: 504 },
        )
      }

      throw fetchError
    }
  } catch (error: any) {
    console.error("[v0] Error analyzing conversation:", error)
    console.error("[v0] Error message:", error?.message)
    console.error("[v0] Error stack:", error?.stack)

    return Response.json(
      {
        error: `Falha ao analisar conversa: ${error?.message || "Erro desconhecido"}`,
      },
      { status: 500 },
    )
  }
}
