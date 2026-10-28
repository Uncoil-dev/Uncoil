from openai import OpenAI
import uncoil

# UNCOIL_API_KEY is read from the environment.
client = uncoil.wrap_openai(OpenAI())
tools = uncoil.trace_tools({"get_weather": lambda city: f"Sunny in {city}"})


@uncoil.trace_agent(name="weather-agent")
def main():
    weather = tools["get_weather"]("Oslo")
    reply = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"Say this nicely: {weather}"}],
    )
    print(reply.choices[0].message.content)


main()
