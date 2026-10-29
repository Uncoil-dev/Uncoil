import { createOpencodeClient } from "@opencode-ai/sdk";

const client = createOpencodeClient({ baseUrl: "http://localhost:4096" });

const result = await client.session.create({
  body: { title: "Create Teams channel" },
});

const sessionId = result.data.id;

const prompt = await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [
      {
        type: "text",
        text: 'Using the Composio MCP Microsoft Teams tools, create a new public channel named "team-uncoil" in the Uncoil team (team ID: 19fb0b36-9d03-490c-a294-5a3ffec0da58) with description "Chat with Uncoil AI bot". If it already exists, just confirm.',
      },
    ],
    agent: "general",
  },
});

console.log(JSON.stringify(prompt.data, null, 2));
