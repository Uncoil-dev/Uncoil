# Framework guide checks

Manual end-to-end checks for the setups on `/integrations/langchain`, `/crewai`, `/openai-agents-sdk` and `/vercel-ai-sdk`.
Each script runs the page's code against the real library with a mocked model, then prints the spans Uncoil would receive
(expect: one run, model calls with tokens, one tool call).

- Python: `pip install -e packages/python-sdk openai openai-agents crewai langchain-core`, then `python -I scripts/framework-guides/<name>.py`
- TypeScript: `npm pack` the SDK, install it with `ai @ai-sdk/openai zod`, then `node scripts/framework-guides/vercel-ai-sdk.mjs`

Last run: crewai 1.15.37, openai-agents 0.24.0, ai 7.0.164.
