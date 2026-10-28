import Anthropic from "@anthropic-ai/sdk";
import { UncoilClient, wrapAnthropic, traceTools, span } from "uncoil-sdk";

const uncoil = new UncoilClient({ environment: "development" });
const anthropic = wrapAnthropic(new Anthropic(), { client: uncoil });
const tools = traceTools({ getWeather: async (city: string) => `Sunny in ${city}` }, { client: uncoil });

async function main() {
  await span("weather-agent", async () => {
    const weather = await tools.getWeather("Oslo");
    const reply = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: `Say this nicely: ${weather}` }],
    });
    console.log(reply.content);
  });
}
main();
