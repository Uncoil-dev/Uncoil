/** Copy-ready "grade your own run" examples, shared by the Scores empty state and the quickstart. */
export type ScoreSnippetLanguage = "python" | "typescript";

export function scoreSnippet(language: ScoreSnippetLanguage, projectId: string): string {
  if (language === "python") {
    return `from uncoil import UncoilClient, trace_agent, current_run_id

client = UncoilClient(project_id="${projectId}")  # API key comes from UNCOIL_API_KEY

@trace_agent(client=client)
async def run_my_agent(question: str):
    answer = "Observability for AI agents."
    # Grade this run from inside the agent. It shows up on the Scores page.
    client.score(current_run_id(), "answer_quality", 0.92, data_type="numeric")
    client.score(current_run_id(), "followed_policy", True, data_type="boolean")
    return answer`;
  }
  return `import { UncoilClient, traceAgent, currentRunId } from 'uncoil-sdk';

const client = new UncoilClient({ projectId: '${projectId}' }); // API key comes from UNCOIL_API_KEY

const runAgent = traceAgent(async (question: string) => {
  const answer = 'Observability for AI agents.';
  // Grade this run from inside the agent. It shows up on the Scores page.
  client.score(currentRunId(), 'answer_quality', 0.92, { dataType: 'numeric' });
  client.score(currentRunId(), 'followed_policy', true, { dataType: 'boolean' });
  return answer;
}, { projectId: '${projectId}' });`;
}
