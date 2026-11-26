import asyncio
import json
import pytest
import uncoil
from uncoil import UncoilClient


class Recorder(UncoilClient):
    def __init__(self):
        super().__init__(api_key="uncoil_sk_live_eu_test")
        self.sent = []

    def _send_span(self, span):
        self.sent.append(span)


@pytest.fixture
def client():
    return Recorder()


def only_step(client):
    assert len(client.sent) == 1
    return client.sent[0]


def test_positional_call_records_a_list_of_arguments(client):
    @uncoil.observe(type="tool", client=client)
    def add(a, b):
        return a + b

    assert add(2, 3) == 5
    step = only_step(client)
    assert step["toolName"] == "add" and step["spanType"] == "tool"
    assert json.loads(step["input"]) == [2, 3]
    assert json.loads(step["output"]) == 5


def test_keyword_call_records_args_and_kwargs(client):
    @uncoil.observe(client=client)
    def search(query, limit=10):
        return [query] * limit

    search("docs", limit=2)
    assert json.loads(only_step(client)["input"]) == {"args": ["docs"], "kwargs": {"limit": 2}}


def test_capture_input_off_records_no_input(client):
    @uncoil.observe(capture_input=False, client=client)
    def echo(value):
        return value

    assert echo("private") == "private"
    step = only_step(client)
    assert step["input"] == ""
    assert step["output"] == "private"


def test_capture_output_off_records_no_output(client):
    @uncoil.observe(capture_output=False, client=client)
    def echo(value):
        return value

    assert echo("private") == "private"
    step = only_step(client)
    assert step["input"] == '["private"]'
    assert step["output"] == ""


def test_async_functions_are_recorded_like_sync_ones(client):
    @uncoil.observe(name="lookup", client=client)
    def lookup_sync(key, fresh=False):
        return {"key": key}

    @uncoil.observe(name="lookup", client=client)
    async def lookup_async(key, fresh=False):
        return {"key": key}

    lookup_sync("a", fresh=True)
    assert asyncio.run(lookup_async("a", fresh=True)) == {"key": "a"}
    sync_step, async_step = client.sent
    for field in ("toolName", "spanType", "input", "output"):
        assert async_step[field] == sync_step[field]
    assert json.loads(async_step["input"]) == {"args": ["a"], "kwargs": {"fresh": True}}
