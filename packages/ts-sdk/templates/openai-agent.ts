import OpenAI from "openai";
import { UncoilClient, wrapOpenAI, traceTools, span } from "uncoil-sdk";

// UNCOIL_API_KEY is read from the environment.
const uncoil = new UncoilClient({ environment: "development" });
const openai = wrapOpenAI(new OpenAI(), { client: uncoil });
const tools = traceTools({ getWeather: async (city: string) => `Sunny in ${city}` }, { client: uncoil });

async function main() {
  await span("weather-agent", async () => {
    const weather = await tools.getWeather("Oslo");
    const reply = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Say this nicely: ${weather}` }],
    });
    console.log(reply.choices[0].message.content);
  });
}
main();
