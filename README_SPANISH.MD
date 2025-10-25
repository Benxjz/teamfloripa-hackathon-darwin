# teamfloripa-hackathon-darwin
Proyecto del equipo Floripa para el Hackathon de Darwin AI

# Worker Performance

Se trata de una feature integrada a la plataforma Darwin AI que mide la **calidad y consistencia** de los asistentes de IA creados para empresas.  
Permite seguir métricas de performance, evolución y adherencia al prompt configurado, tanto durante el onboarding como después del lanzamiento del asistente.

---

## 🚀 Demo

🔗 **Accedé al prototipo funcional:**  
👉 [https://worker-performance-darwin.vercel.app/](https://worker-performance-darwin.vercel.app/)

---

## 🧪 Cómo probar

1. Ingresá a la aplicación desde el link de arriba.  
2. Subí un archivo `.csv` con las conversaciones exportadas desde **Metabase**, usando el *Worker ID* y el *conversation prefix*.  
3. Hacé clic en **“Analizar Conversaciones”**.  
4. El sistema procesará los datos en lotes y mostrará:
   - El **puntaje general (0–100)** para cada conversación;  
   - Métricas detalladas (adherencia a la misión, coherencia, cumplimiento de directrices, calidad);  
   - Análisis por bloque de mensajes del asistente;  
   - Identificación de desvíos;  
   - Sugerencias de mejora.
     
5. Repetí el proceso con distintos archivos CSV para comparar el rendimiento entre asistentes.

---

## 🎯 Objetivo

El objetivo del proyecto es ofrecer una capa de **monitoreo y diagnóstico de calidad** para cada asistente, de modo que las empresas y el equipo de Darwin puedan:

- Entender si el asistente sigue correctamente el prompt;  
- Detectar respuestas incoherentes o inconsistentes con la base de conocimiento.  

💡 **Por qué esto importa:**  
Hoy los equipos de Darwin y los clientes deben evaluar manualmente si un asistente “está bien”.  
Esta herramienta automatiza ese proceso, generando confianza, agilidad y transparencia en el producto.

---

## 🧩 Contexto de desarrollo

Inicialmente usamos **Vercel v0** para acelerar la construcción de la interfaz, y a partir de ahí implementamos **ajustes y capas complementarias** que agregan lógica de evaluación, cálculo de métricas e integración con la plataforma Darwin AI.  
Este repositorio concentra **el backend, la documentación técnica y la explicación** que complementan el código generado en Vercel.

---

## 📊 Métricas Evaluadas

| Métrica | Qué mide | Interpretación |
|----------|-----------|----------------|
| **Adherence to Mission** | Adherencia a la misión del asistente | Si el asistente cumple con el objetivo principal configurado en el prompt |
| **Context Coherence** | Coherencia de contexto | Si mantiene el razonamiento y evita contradicciones |
| **Guideline Compliance** | Cumplimiento de Directrices | Si usa correctamente los *Prompt Templates* y las *Transition Tools* |
| **Response Quality** | Claridad y utilidad de las respuestas | Si responde de forma clara, útil y completa |
| **Overall Score** | Puntaje general (0–100) | Promedio ponderado de las métricas anteriores |

Los puntajes varían de **0 a 100**, siendo:
- **80–100:** excelente  
- **60–79:** necesita ajustes  
- **0–59:** rendimiento crítico  

---

## 💸 Impacto en el Negocio

- **Acelera el lanzamiento** de nuevos asistentes (cuentas listas más rápido).  
- **Reduce el churn**, con asistentes más consistentes y confiables.  
- **Disminuye costos operativos**, eliminando revisiones manuales.  
- **Aumenta la visibilidad** sobre el desempeño de cada asistente.

---

## 📚 Documentación

- [Métricas](docs/metrics_definition.md)  
- [Roadmap](docs/roadmap.md)

---

## 🧠 Visión de Producto

**Worker Performance** transforma la evaluación de calidad de los asistentes - de un proceso manual y subjetivo a una capa automática, objetiva y medible.  
Genera confianza, mejora la experiencia del cliente y fortalece el producto Darwin AI.

---

## 👥 Equipo — Team Floripa

- 🧑‍💻 **César Gutierrez**  
- 🧑‍💻 **Tomás Varsavsky**  
- 👩‍💻 **María Eduarda**  
- 🧑‍💻 **Benjamim Almeida**

---

## 📄 Licencia

MIT © 2025 Team Floripa
