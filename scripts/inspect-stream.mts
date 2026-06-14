/**
 * Este script captura o stream SSE do CopilotKit para diagnosticar o problema.
 * Execute enquanto o servidor está rodando na porta 3000.
 * 
 * Executa: pnpm tsx --env-file=.env scripts/inspect-stream.mts
 */

const url = "http://localhost:3000/api/copilotkit";

// Simula uma mensagem de chat com o protocolo AG-UI do CopilotKit 1.59
// O formato exato é JSON com o corpo GraphQL usado internamente
const body = JSON.stringify({
  query: `
    mutation GenerateCopilotResponse($data: GenerateCopilotResponseInput!) {
      generateCopilotResponse(data: $data) {
        threadId
        runId
        message {
          __typename
          ... on TextMessageOutput {
            id
            createdAt
            role
            content
          }
          ... on ActionExecutionMessageOutput {
            id
            createdAt
            name
            arguments
          }
          ... on ResultMessageOutput {
            id
            createdAt
            actionExecutionId
            actionName
            result
          }
        }
      }
    }
  `,
  variables: {
    data: {
      messages: [
        {
          id: "test-msg-1",
          createdAt: new Date().toISOString(),
          role: "user",
          content: "Quais decisoes foram tomadas na ultima reuniao?",
        }
      ],
      frontend: {
        actions: [],
        url: "http://localhost:3000",
      },
    }
  }
});

console.log("Sending request to", url);

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream, application/json",
    },
    body,
  });

  console.log("Status:", response.status);
  console.log("Content-Type:", response.headers.get("content-type"));
  
  const text = await response.text();
  console.log("\n=== RAW RESPONSE (first 3000 chars) ===");
  console.log(text.substring(0, 3000));
} catch (err) {
  console.error("Request failed:", err);
}
