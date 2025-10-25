"use server"

import { createClient } from "@/lib/supabase/server"

interface SaveAnalysisParams {
  conversationId: string
  sessionId?: string
  stagesPassed?: string
  content: string
  analysis: any
}

export async function saveAnalysis(params: SaveAnalysisParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("conversation_analyses")
      .insert({
        conversation_id: params.conversationId,
        session_id: params.sessionId,
        stages_passed: params.stagesPassed,
        content: params.content,
        analysis: params.analysis,
        overall_score: params.analysis.overallScore,
        adherence_to_mission: params.analysis.adherenceToMission,
        context_coherence: params.analysis.contextCoherence,
        guideline_compliance: params.analysis.guidelineCompliance,
        response_quality: params.analysis.responseQuality,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error saving analysis to Supabase:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] Analysis saved successfully to Supabase:", data.id)
    return { success: true, data }
  } catch (error: any) {
    console.error("[v0] Exception saving analysis:", error)
    return { success: false, error: error.message }
  }
}

export async function getAnalyses(limit = 100) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("conversation_analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching analyses from Supabase:", error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("[v0] Exception fetching analyses:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function getAnalysisByConversationId(conversationId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("conversation_analyses")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return { success: true, data: null }
      }
      console.error("[v0] Error fetching analysis from Supabase:", error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("[v0] Exception fetching analysis:", error)
    return { success: false, error: error.message, data: null }
  }
}
