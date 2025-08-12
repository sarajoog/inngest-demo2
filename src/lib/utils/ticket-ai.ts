import { createAgent, gemini } from '@inngest/agent-kit'

// Define proper types for the response
type MessageOutput =
  | string
  | { content: string }
  | { text: string }
  | { message: string }
  | Record<string, unknown>

interface AgentResponse {
  output: MessageOutput[]
}

const analyzeTicket = async (ticket: {
  title: string
  description: string
}) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }

  const supportAgent = createAgent({
    model: gemini({
      model: 'gemini-1.5-flash-8b',
      apiKey: apiKey,
    }),
    name: 'AI Ticket Triage Assistant',
    system: `You are an expert AI assistant that processes technical support tickets. 

Your job is to:
1. Summarize the issue.
2. Estimate its priority.
3. Provide helpful notes and resource links for human moderators.
4. List relevant technical skills required.

IMPORTANT:
- Respond with *only* valid raw JSON.
- Do NOT include markdown, code fences, comments, or any extra formatting.
- The format must be a raw JSON object.

Repeat: Do not wrap your output in markdown or code fences.`,
  })

  const response = (await supportAgent.run(
    `You are a ticket triage agent. Only return a strict JSON object with no extra text, headers, or markdown.
        
Analyze the following support ticket and provide a JSON object with:

- summary: A short 1-2 sentence summary of the issue.
- priority: One of "low", "medium", or "high".
- helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
- relatedSkills: An array of relevant skills required to solve the issue (e.g., ["React", "MongoDB"]).

Respond ONLY in this JSON format and do not include any other text or markdown in the answer:

{
"summary": "Short summary of the ticket",
"priority": "high",
"helpfulNotes": "Here are useful tips...",
"relatedSkills": ["React", "Node.js"]
}

---

Ticket information:

- Title: ${ticket.title}
- Description: ${ticket.description}`
  )) as AgentResponse

  const getRawResponse = (output: MessageOutput): string => {
    if (typeof output === 'string') return output
    if ('content' in output && typeof output.content === 'string')
      return output.content
    if ('text' in output && typeof output.text === 'string') return output.text
    if ('message' in output && typeof output.message === 'string')
      return output.message
    console.warn('Unexpected response format:', output)
    return JSON.stringify(output)
  }

  const rawResponse = getRawResponse(response.output[0])
  console.log('Raw AI Response:', rawResponse) // Debug logging

  try {
    // Strategy 1: Direct JSON parse
    try {
      return JSON.parse(rawResponse)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log('Direct parse failed, trying extraction')
    }

    // Strategy 2: Extract JSON from markdown
    let jsonString = rawResponse
    const jsonMatch = jsonString.match(/(\{[\s\S]*\})/)
    if (jsonMatch) {
      jsonString = jsonMatch[1]
    }

    // Strategy 3: Progressive cleaning
    const cleanedJson = jsonString
      // Remove code block markers if present
      .replace(/```(json)?/g, '')
      // Fix unquoted keys (but not string values)
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      // Convert single quotes to double quotes, but not in content
      .replace(/(?<!\\)'/g, '"')
      // Remove trailing commas
      .replace(/,\s*([}\]])/g, '$1')
      // Fix escaped characters
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')

    console.log('Cleaned JSON:', cleanedJson) // Debug logging

    // Strategy 4: Try parsing the cleaned JSON
    try {
      return JSON.parse(cleanedJson)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log('Cleaned parse failed, trying manual repair')
    }

    // Strategy 5: Manual JSON repair as last resort
    try {
      // Find the first { and last } to extract potential JSON
      const firstBrace = cleanedJson.indexOf('{')
      const lastBrace = cleanedJson.lastIndexOf('}')

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const potentialJson = cleanedJson.slice(firstBrace, lastBrace + 1)
        return JSON.parse(potentialJson)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log('Manual repair failed')
    }

    throw new Error(
      `Unable to parse AI response as JSON. Received: ${rawResponse.substring(0, 200)}...`
    )
  } catch (e) {
    console.error('Final JSON parsing failure:', e)
    console.error('Original response:', rawResponse)
    throw new Error(
      'Failed to process AI response. ' +
        'Please ensure your prompt explicitly requests valid JSON format. ' +
        `Error: ${e instanceof Error ? e.message : 'Unknown parsing error'}`
    )
  }
}

export default analyzeTicket
