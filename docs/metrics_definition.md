# Métricas

Este documento explica o que cada métrica representa e por que ela é importante.  
Essas medições ajudam a avaliar se o assistente de IA está realmente entregando respostas úteis, claras e consistentes.

O analisador processa conversas e retorna um JSON com notas **0–100** sobre a qualidade do assistente.  
Essas métricas mostram o quanto o assistente segue sua missão, mantém coerência e entrega respostas claras.

---

## 🧠 Métricas principais

| Métrica | O que mede | Interpretação |
|----------|-------------|----------------|
| **overallScore** | Nota geral da conversa | Média das demais métricas. Representa o desempenho total do assistente. |
| **adherenceToMission** | Aderência à missão original | Verifica se o assistente cumpre o objetivo definido no `<mission>`. |
| **contextCoherence** | Coerência contextual | Mede se as respostas mantêm o raciocínio e não se contradizem. |
| **guidelineCompliance** | Seguimento de Diretrizes | Avalia o uso correto de *Prompt Templates* e tom de voz. |
| **responseQuality** | Qualidade das respostas | Verifica se o conteúdo é claro, completo e útil para o usuário. |

---

## 🔹 Análise por bloco

Cada sequência de mensagens consecutivas da IA (“bloco”) recebe:

- **score (0–100):** nota individual do bloco;  
- **issues:** principais falhas encontradas;  
- **strengths:** pontos fortes identificados;  
- **detailedFeedback:** sugestão breve de melhoria.

Esses dados alimentam o painel e permitem ver em quais partes o assistente está indo bem ou precisa de ajustes.

---

## 📋 Dados complementares

- **deviations:** desvios detectados na conversa.  
- **suggestions:** recomendações de melhoria.  
- **summary / detailedReport:** resumo executivo e análise detalhada da conversa.

---

## ⚙️ Escala de interpretação

| Faixa | Status |
|-------|---------|
| **80–100** | Excelente desempenho |
| **60–79** | Precisa de ajustes |
| **0–59** | Desempenho crítico |

---

## 🧩 Como funciona o cálculo

1. O backend extrai **Missão**, **Ferramentas** e **Templates** do conteúdo analisado.  
2. Agrupa as mensagens da IA em **blocos** de resposta.  
3. Gera um *prompt* de avaliação e envia à OpenAI.  
4. Recebe um **JSON estruturado** com as notas, razões e sugestões.  
5. Valida e normaliza os resultados antes de salvar e exibir no painel.

---

## 🧾 Exemplo de resultado (resumo)

```json
{
  "overallScore": 84,
  "adherenceToMission": 88,
  "contextCoherence": 80,
  "guidelineCompliance": 82,
  "responseQuality": 85,
  "summary": "Boa aderência e consistência geral.",
  "suggestions": ["Usar template de qualificação antes de encerrar."]
}
```


