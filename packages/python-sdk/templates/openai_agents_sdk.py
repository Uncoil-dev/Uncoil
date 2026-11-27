"""An OpenAI Agents SDK agent with one function tool, traced in Uncoil.

pip install uncoil-sdk openai-agents
Set UNCOIL_API_KEY and OPENAI_API_KEY, then run this file.
"""
import asyncio

from agents import Agent, Runner, function_tool
import uncoil

# Records every OpenAI call the agent makes. UNCOIL_API_KEY is read from the environment.
uncoil.init()


def lookup_order(order_id: str) -> str:
    """Look up an order by id."""
    return f"Order {order_id} shipped yesterday."


# trace_tools records each tool call as its own step; function_tool hands it to the agent.
lookup_order = function_tool(uncoil.trace_tools({"lookup_order": lookup_order})["lookup_order"])

agent = Agent(
    name="Support",
    instructions="Look up the order, then answer in one sentence.",
    model="gpt-4o-mini",
    tools=[lookup_order],
)


@uncoil.trace_agent(name="support-triage")
async def triage(message: str) -> str:
    result = await Runner.run(agent, message)
    return result.final_output


print(asyncio.run(triage("Where is order A1?")))
