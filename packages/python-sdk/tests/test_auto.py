import httpx2 as httpx
import pytest
from openai import OpenAI, AsyncOpenAI
from anthropic import Anthropic
import tracify
from test_steps import Recorder
from test_integrations import CHAT, MESSAGE, transport, llms, streaming_transport, message_events


@pytest.fixture(autouse=True)
def off():
    yield
    tracify.uninit()


def test_init_traces_unwrapped_clients():
    recorder = Recorder()
    active = tracify.init(client=recorder)
    assert "openai" in active and "anthropic" in active
    raw = OpenAI(api_key='test', http_client=httpx.Client(transport=transport(CHAT)))
    assert raw.chat.completions.create(model='test-model', messages=[]).choices[0].message.content == 'hello'
    claude = Anthropic(api_key='test', http_client=httpx.Client(transport=transport(MESSAGE)))
    claude.messages.create(model='test-model', max_tokens=5, messages=[])
    spans = llms(recorder)
    assert [s['inputTokens'] for s in spans] == [8, 8] and [s['outputTokens'] for s in spans] == [3, 3]


@pytest.mark.asyncio
async def test_init_traces_async_clients():
    recorder = Recorder()
    tracify.init(client=recorder)
    raw = AsyncOpenAI(api_key='test', http_client=httpx.AsyncClient(transport=transport(CHAT)))
    await raw.chat.completions.create(model='test-model', messages=[])
    assert len(llms(recorder)) == 1
    await raw.close()


def test_init_traces_anthropic_stream_helper():
    recorder = Recorder()
    tracify.init(client=recorder)
    raw = Anthropic(api_key='test', http_client=httpx.Client(transport=streaming_transport(message_events(), True)))
    with raw.messages.stream(model='test-model', messages=[], max_tokens=10) as stream:
        assert ''.join(stream.text_stream) == 'hello'
    assert len(llms(recorder)) == 1 and llms(recorder)[0]['outputTokens'] == 3


def test_wrapped_client_is_not_recorded_twice():
    recorder = Recorder()
    tracify.init(client=recorder)
    raw = OpenAI(api_key='test', http_client=httpx.Client(transport=transport(CHAT)))
    tracify.wrap_openai(raw, client=recorder).chat.completions.create(model='test-model', messages=[])
    assert len(llms(recorder)) == 1


def test_provider_error_is_recorded_and_raised():
    recorder = Recorder()
    tracify.init(client=recorder)
    raw = OpenAI(api_key='test', max_retries=0, http_client=httpx.Client(transport=transport(dict(error=dict(message='bad', type='invalid_request_error')), 400)))
    with pytest.raises(Exception):
        raw.chat.completions.create(model='test-model', messages=[])
    assert llms(recorder)[0]['errorType'] == 'BadRequestError'


def test_uninit_restores_everything():
    recorder = Recorder()
    tracify.init(client=recorder)
    tracify.uninit()
    raw = OpenAI(api_key='test', http_client=httpx.Client(transport=transport(CHAT)))
    raw.chat.completions.create(model='test-model', messages=[])
    assert recorder.sent == []


def test_langchain_model_is_recorded_once_and_stops_after_uninit():
    from langchain_core.language_models.fake_chat_models import FakeListChatModel
    recorder = Recorder()
    tracify.init(client=recorder)
    assert FakeListChatModel(responses=['hi']).invoke('hello').content == 'hi'
    assert len(recorder.sent) == 1 and recorder.sent[0]['modelId'] == 'FakeListChatModel'
    tracify.uninit()
    FakeListChatModel(responses=['hi']).invoke('hello')
    assert len(recorder.sent) == 1
