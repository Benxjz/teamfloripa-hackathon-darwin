# teamfloripa-hackathon-darwin
Projeto da equipe Floripa para o Hackathon da Darwin AI

# Worker Performance

Trata-se de uma feature a ser integrada à plataforma Darwin AI que mede a qualidade e consistência dos assistentes de IA criados para empresas.  
Ele permite acompanhar métricas de performance, evolução e aderência ao prompt configurado, tanto durante o onboarding quanto após o lançamento do assistente.

---

## 🚀 Demo

🔗 **Acesse o protótipo funcional:**  
👉 [https://worker-performance-darwin.vercel.app/](https://worker-performance-darwin.vercel.app/)

---

## 🧪 Como testar

1. Acesse a aplicação no link acima.  
2. Faça upload de um arquivo `.csv` contendo as conversas exportadas do **Metabase** através do Worker ID e conversation prefix.  
3. Clique em **“Analisar Conversas”**.  
4. O sistema processará os dados em lotes e exibirá:
   - A **pontuação geral (0–100)** para cada conversa;  
   - Métricas detalhadas (aderência à missão, coerência, diretrizes, qualidade)  
   - Análise por bloco de mensagens da IA  
   - Identificação de desvios  
   - Sugestões de melhoria
     
5. Repita com diferentes arquivos CSV para comparar o desempenho entre assistentes.

---

## 🎯 Objetivo

O objetivo do projeto é oferecer uma camada de **monitoramento e diagnóstico de qualidade** para cada assistente, de modo que as empresas e o time Darwin possam:

- Entender se o assistente está seguindo o prompt corretamente;  
- Detectar respostas incoerentes ou inconsistentes com a base de conhecimento;  

💡 **Por que isso importa:**  
Hoje, os times da Darwin e os clientes precisam avaliar manualmente se um assistente “está bom”.  
Essa ferramenta automatiza esse processo, gerando confiança, agilidade e transparência no produto.

---

## 🧩 Contexto de desenvolvimento

Inicialmente usamos o **Vercel v0** para acelerar a construção da interface, e a partir daí iremos implementar **ajustes e camadas complementares** que adicionam lógica de avaliação, cálculo de métricas e integração com a plataforma Darwin AI.  
Este repositório concentra **o backend, documentação técnica e explicação** que somam ao código gerado no Vercel.

---

## 📊 Métricas Avaliadas

| Métrica | O que mede | Interpretação |
|----------|-------------|----------------|
| **Adherence to Mission** | Aderência à missão do assistente | Se o assistente cumpre o objetivo principal configurado no prompt |
| **Context Coherence** | Coerência de contexto | Se mantém o raciocínio e evita contradições |
| **Guideline Compliance** | Seguimento de Diretrizes | Se usa os *Prompt Templates* e *Transition Tools* corretamente |
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
- **Dá visibilidade** ao desempenho do assistente e como tem se saído.

---

## 📚 Documentação

- [Métricas](docs/metrics_definition.md)  
- [Roadmap](docs/roadmap.md)

---

## 🧠 Visão de Produto

O **Desempenho IA** transforma a avaliação de qualidade dos assistentes —  
de um processo manual e subjetivo para uma camada automática, objetiva e mensurável.  
Isso gera confiança, melhora a experiência do cliente e fortalece o produto Darwin AI.

---

## 👥 Equipe — Team Floripa

- 🧑‍💻 **César Gutierrez**  
- 🧑‍💻 **Tomás Varsavsky**  
- 👩‍💻 **María Eduarda**  
- 🧑‍💻 **Benjamim Almeida**


---

## 📄 Licença

MIT © 2025 Team Floripa
