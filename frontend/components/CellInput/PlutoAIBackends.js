/**
 * select_api switches on the available keys and
 */
export const select_api = ({ openai_key = window.openai_key, juliahub_key = window.juliahub_key, anthropic_key = window.anthropic_key }) => {
    const can_use_juliahub = !!juliahub_key
    const can_use_open_ai = !!openai_key
    const can_use_anthropic = !!anthropic_key

    const juliahub_client = async (question) => {
        console.log(juliahub_key, question) 
        const headers = {
            "accept": "text/plain",
            "Content-Type": "text/plain",
            "x-juliahub-ensure-js": "true"
        }
        if (juliahub_key?.length > 5) {
            headers["Authorization"] = `Bearer ${juliahub_key.replace("Bearer ", "")}`
        }
        const resp = await fetch("https://pg.juliahub.dev/api/v1/askjulia", {
            method: "POST",
            headers,
            body: question,
        })
        if (resp.ok) {
            const { answer } = await resp.json()
            return answer
        }
        return undefined
    }

    const openai_client = async (question) => {
        const response = await fetch("https://api.openai.com/v1/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openai_key}`,
            },
            body: JSON.stringify({
                model: "text-davinci-003",
                prompt: `\`\`\`\n${question}\n\`\`\`\n\n${
                    question.length > 100 ? "Summarize the the intent of" : "Explain"
                } this Julia code in a consise way. Use Markdown to highlight important concepts:\n1.`,
                temperature: 0.3,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            }),
        })
        if (response.ok) {
            const json = await response.json()
            console.info("OpenAI API response", json)
            const explanation = `1. ${json.choices[0].text}`
            return explanation
        }
        return undefined
    }

    const anthropic_client = async (question) => {
        const response = await fetch("https://api.anthropic.com/v1/complete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": `${anthropic_key}`,
            },
            body: JSON.stringify({
                prompt: `\`\`\`\n${question}\n\`\`\`\n\n${
                    question.length > 100 ? "Summarize the the intent of" : "Explain"
                } this Julia code in a consise way. Use Markdown to highlight important concepts:\n1.`,
                model: "claude-v1",
                max_tokens_to_sample: 300,
                stop_sequences: ["\n\nHuman:"],
                stream: false,
            }),
        })
        if (response.ok) {
            const { completion } = await response.json()
            console.info("Antropic response", completion)
            return completion
        }
        return undefined
    }

    if (can_use_juliahub) return juliahub_client
    if (can_use_open_ai) return openai_client
    if (can_use_anthropic) return anthropic_client

    return () => undefined
}
