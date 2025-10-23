# teamfloripa-hackathon-darwin
Projeto da equipe Floripa para o Hackathon da Darwin AI

# Desempenho IA

Trata-se de uma feature integrada à plataforma Darwin AI que mede a qualidade e consistência dos assistentes de IA criados para empresas.  
Ele permite acompanhar métricas de performance, evolução e aderência ao prompt configurado, tanto durante o onboarding quanto após o lançamento do assistente.

---

## 🎯 Objetivo

O objetivo do projeto é oferecer uma camada de **monitoramento e diagnóstico de qualidade** para cada assistente, de modo que as empresas e o time Darwin possam:

- Entender se o assistente está seguindo o prompt corretamente;  
- Detectar respostas incoerentes ou inconsistentes com a base de conhecimento;  

💡 **Por que isso importa:**  
Hoje, os times da Darwin e os clientes precisam avaliar manualmente se um assistente “está bom”.  
Essa ferramenta automatiza esse processo, gerando confiança, agilidade e transparência no produto.

## 🧩 Contexto de desenvolvimento

**Inicialmente usamos o Vercel v0 para acelerar a construção da interface**, e a partir daí estamos implementando **ajustes e camadas complementares** que adicionam lógica de avaliação, cálculo de métricas e integração com a plataforma Darwin AI.  
Este repositório concentra **o backend, documentação técnica e explicação** que somam ao código gerado no Vercel.
---
## Configuração

### 1. Adicionar API Key do OpenAI

Para usar a análise de conversas, você precisa adicionar sua API key do OpenAI:

1. Acesse [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crie uma nova API key
3. No v0, clique no ícone de **Vars** (variáveis) na barra lateral esquerda
4. Adicione uma nova variável:
   - **Nome**: `OPENAI_API_KEY`
   - **Valor**: Sua API key do OpenAI (começa com `sk-...`)

### 2. Como Usar

1. A plataforma carrega automaticamente as conversas do CSV
2. Clique no botão **"Analisar Conversas"** para iniciar a análise
3. O sistema processa as conversas em lotes de 3 simultaneamente
4. Cada conversa recebe:
   - Pontuação geral (0-100)
   - Métricas detalhadas (aderência à missão, coerência, diretrizes, qualidade)
   - Análise linha por linha
   - Identificação de desvios
   - Sugestões de melhoria

### 3. Recursos

- **Processamento Paralelo**: Analisa múltiplas conversas simultaneamente
- **Análise Detalhada**: Cada linha da conversa é avaliada individualmente
- **Métricas Específicas**: Aderência à missão, coerência contextual, seguimento de diretrizes e qualidade
- **Feedback Acionável**: Sugestões específicas de melhoria
- **Interface Visual**: Cores indicativas (verde=bom, amarelo=atenção, vermelho=problema)

### 4. Custos

A análise usa a API do OpenAI (GPT-4), que tem custos associados. Cada análise consome tokens baseado no tamanho da conversa. Monitore seu uso em [platform.openai.com/usage](https://platform.openai.com/usage).

---

## 📊 Métricas Avaliadas

| Métrica | O que mede | Interpretação |
|----------|-------------|----------------|
| **Adherence to Mission** | Aderência à missão do assistente | Se o assistente cumpre o objetivo principal configurado no prompt |
| **Context Coherence** | Coerência de contexto | Se mantém o raciocínio e evita contradições |
| **Guideline Compliance** | Conformidade com regras | Se usa os *Prompt Templates* e *Transition Tools* corretamente |
| **Response Quality** | Clareza e utilidade das respostas | Se responde de forma clara, útil e completa |
| **Overall Score** | Nota geral (0–100) | Média ponderada das métricas acima |

As métricas variam de **0 a 100**, sendo:
- **80–100:** excelente  
- **60–79:** precisa de ajustes  
- **0–59:** desempenho crítico  

---

## 💸 Impacto no Negócio

- **Acelera o lançamento** de novos assistentes (contas prontas mais rápido).  
- **Reduz churn** com assistentes mais consistentes e confiáveis.  
- **Diminui custo operacional**, eliminando revisões manuais.  
- **Dá visibilidade** ao desempenho do assistente e como tem se saído

---

## 📚 Documentação

- [Métricas](docs/metrics.md)  
- [Roadmap](docs/roadmap.md)

---

## 🧠 Visão de Produto

O **Desempenho IA** transforma a avaliação de qualidade dos assistentes —  
de um processo manual e subjetivo para uma camada automática, objetiva e mensurável.  
Isso gera confiança, melhora a experiência do cliente e fortalece o produto Darwin AI.

---

## 📄 Licença

MIT © 2025 Team Floripa
