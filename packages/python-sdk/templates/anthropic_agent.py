from anthropic import Anthropic
import uncoil

client = uncoil.wrap_anthropic(Anthropic())
tools = uncoil.trace_tools({"get_weather": lambda city: f"Sunny in {city}"})


@uncoil.trace_agent(name="weather-agent")
def main():
    weather = tools["get_weather"]("Oslo")
    reply = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": f"Say this nicely: {weather}"}],
    )
    print(reply.content[0].text)


main()
