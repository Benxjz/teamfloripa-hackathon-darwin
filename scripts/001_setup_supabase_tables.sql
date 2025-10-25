-- Tabela para armazenar prompts de análise (já existe, mas vamos garantir a estrutura)
CREATE TABLE IF NOT EXISTS analysis_prompts (
  id INTEGER PRIMARY KEY DEFAULT 1,
  prompt_text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar análises de conversas
CREATE TABLE IF NOT EXISTS conversation_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  session_id TEXT,
  stages_passed TEXT,
  content TEXT NOT NULL,
  analysis JSONB NOT NULL,
  overall_score NUMERIC(5,2),
  adherence_to_mission NUMERIC(5,2),
  context_coherence NUMERIC(5,2),
  guideline_compliance NUMERIC(5,2),
  response_quality NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_conversation_analyses_conversation_id ON conversation_analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analyses_created_at ON conversation_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analyses_overall_score ON conversation_analyses(overall_score DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_analysis_prompts_updated_at ON analysis_prompts;
CREATE TRIGGER update_analysis_prompts_updated_at
    BEFORE UPDATE ON analysis_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_analyses_updated_at ON conversation_analyses;
CREATE TRIGGER update_conversation_analyses_updated_at
    BEFORE UPDATE ON conversation_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE analysis_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analyses ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir todas as operações para simplificar)
DROP POLICY IF EXISTS "Allow all operations on analysis_prompts" ON analysis_prompts;
CREATE POLICY "Allow all operations on analysis_prompts" ON analysis_prompts
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on conversation_analyses" ON conversation_analyses;
CREATE POLICY "Allow all operations on conversation_analyses" ON conversation_analyses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Inserir prompt padrão se não existir
INSERT INTO analysis_prompts (id, prompt_text)
VALUES (1, 'Você é um auditor especializado em análise de qualidade de conversas de agentes de IA para vendas e qualificação de clientes...')
ON CONFLICT (id) DO NOTHING;
