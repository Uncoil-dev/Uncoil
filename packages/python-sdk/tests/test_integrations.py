import asyncio
import json
import httpx2 as httpx
import pytest
from openai import OpenAI, AsyncOpenAI
from anthropic import Anthropic, AsyncAnthropic
import uncoil
from test_steps import Recorder

CHAT = dict(id='chat-test', object='chat.completion', created=1, model='test-model', choices=[dict(index=0,message=dict(role='assistant',content='hello'),finish_reason='stop')],usage=dict(prompt_tokens=8,completion_tokens=3,total_tokens=11))
MESSAGE = dict(id='msg-test', type='message', role='assistant',model='test-model',content=[dict(type='text',text='hello')], stop_reason='end_turn',stop_sequence=None,usage=dict(input_tokens=8,output_tokens=3))
def transport(body, status=200):
    return httpx.MockTransport(lambda request: httpx.Response(status,json=body,request=request))
def llms(client): return [s for s in client.sent if s['spanType']=='llm_call']

def test_openai_preserves_typed_response_and_nested_context():
    recorder=Recorder()
    raw=OpenAI(api_key='test',http_client=httpx.Client(transport=transport(CHAT)))
    wrapped=uncoil.wrap_openai(raw,client=recorder,calculate_cost=lambda usage: .02)
    assert uncoil.wrap_openai(wrapped) is wrapped
    with uncoil.span('parent',type='agent',client=recorder):
        result=wrapped.chat.completions.create(model='test-model',messages=[])
    assert result.choices[0].message.content=='hello'
    child=llms(recorder)[0]; parent=recorder.sent[-1]
    assert child['parentSpanId']==parent['spanId'] and child['runId']==parent['runId']
    assert child['inputTokens']==8 and child['outputTokens']==3 and child['costUsd']==.02
    raw.close()

@pytest.mark.asyncio
async def test_async_provider_concurrency():
    recorder=Recorder()
    raw=AsyncOpenAI(api_key='test',http_client=httpx.AsyncClient(transport=transport(CHAT)))
    wrapped=uncoil.wrap_openai(raw,client=recorder)
    await asyncio.gather(*(wrapped.chat.completions.create(model='test-model',messages=[]) for _ in range(3)))
    assert len(llms(recorder))==3 and len({s['runId'] for s in llms(recorder)})==3
    assert all(s['runId']!='unknown' for s in recorder.sent)
    await raw.close()

def test_provider_exception_is_unchanged_and_recorded():
    recorder=Recorder(); raw=OpenAI(api_key='test',max_retries=0,http_client=httpx.Client(transport=transport(dict(error=dict(message='bad',type='invalid_request_error')),400)))
    with pytest.raises(Exception) as error:
        uncoil.wrap_openai(raw,client=recorder).chat.completions.create(model='test-model',messages=[])
    assert error.value.status_code==400 and llms(recorder)[0]['errorType']=='BadRequestError'
    raw.close()

def sse(events, anthropic=False):
    return ''.join(('event: %s\n'%e['type'] if anthropic else '')+'data: '+json.dumps(e)+'\n\n' for e in events)+( '' if anthropic else 'data: [DONE]\n\n')
def streaming_transport(events, anthropic=False):
    return httpx.MockTransport(lambda request: httpx.Response(200,headers={'content-type':'text/event-stream'},content=sse(events,anthropic),request=request))
def chat_events():
    return [dict(id='a',object='chat.completion.chunk',created=1,model='test-model',choices=[dict(index=0,delta=dict(content='hello'),finish_reason=None)]),dict(id='a',object='chat.completion.chunk',created=1,model='test-model',choices=[],usage=dict(prompt_tokens=8,completion_tokens=3,total_tokens=11))]
def message_events():
    return [dict(type='message_start',message=dict(MESSAGE,content=[],usage=dict(input_tokens=8,output_tokens=0,cache_creation_input_tokens=20,cache_read_input_tokens=30))),dict(type='content_block_start',index=0,content_block=dict(type='text',text='')),dict(type='content_block_delta',index=0,delta=dict(type='text_delta',text='hello')),dict(type='content_block_stop',index=0),dict(type='message_delta',delta=dict(stop_reason='end_turn',stop_sequence=None),usage=dict(input_tokens=None,cache_creation_input_tokens=None,cache_read_input_tokens=None,output_tokens=3)),dict(type='message_stop')]

def test_openai_stream_usage_and_close():
    recorder=Recorder(); raw=OpenAI(api_key='test',http_client=httpx.Client(transport=streaming_transport(chat_events())))
    wrapped=uncoil.wrap_openai(raw,client=recorder)
    stream=wrapped.chat.completions.create(model='test-model',messages=[],stream=True)
    values=list(stream)
    assert values[0].choices[0].delta.content=='hello'
    assert llms(recorder)[0]['inputTokens']==8 and llms(recorder)[0]['outputTokens']==3 and 'ttftMs' in llms(recorder)[0]
    stream=wrapped.chat.completions.create(model='test-model',messages=[],stream=True); next(iter(stream)); stream.close()
    assert len(llms(recorder))==2
    raw.close()

def test_anthropic_helper_final_message_and_usage():
    recorder=Recorder(); raw=Anthropic(api_key='test',http_client=httpx.Client(transport=streaming_transport(message_events(),True)))
    with uncoil.wrap_anthropic(raw,client=recorder).messages.stream(model='test-model',messages=[],max_tokens=10) as stream:
        assert ''.join(stream.text_stream)=='hello'
        assert stream.get_final_message().content[0].text=='hello'
    row=llms(recorder)[0]
    assert row['inputTokens']==58 and row['outputTokens']==3 and 'ttftMs' in row
    raw.close()

@pytest.mark.asyncio
async def test_async_anthropic_and_stream():
    recorder=Recorder(); raw=AsyncAnthropic(api_key='test',http_client=httpx.AsyncClient(transport=streaming_transport(message_events(),True)))
    async with uncoil.wrap_anthropic(raw,client=recorder).messages.stream(model='test-model',messages=[],max_tokens=10) as stream:
        assert ''.join([text async for text in stream.text_stream])=='hello'
        assert (await stream.get_final_message()).content[0].text=='hello'
    assert llms(recorder)[0]['inputTokens']==58 and llms(recorder)[0]['outputTokens']==3
    await raw.close()

def test_real_langgraph_nodes_and_tools():
    from typing import TypedDict
    from langgraph.graph import StateGraph, START, END
    from langchain_core.tools import tool
    class State(TypedDict): value: str
    @tool
    def lookup(value: str) -> str:
        '''Look up a value.'''
        return value+'!'
    def node(state,config): return dict(value=lookup.invoke(dict(value=state['value']),config))
    graph=StateGraph(State); graph.add_node('answer',node); graph.add_edge(START,'answer'); graph.add_edge('answer',END)
    recorder=Recorder(); handler=uncoil.langgraph_callback(client=recorder,name='test-graph')
    assert graph.compile().invoke(dict(value='hi'),dict(callbacks=[handler]))['value']=='hi!'
    rows={s['toolName']:s for s in recorder.sent}
    assert rows['lookup']['spanType']=='tool_call' and rows['lookup']['parentSpanId']==rows['answer']['spanId']
    assert len({s['runId'] for s in recorder.sent})==1 and any(s['spanType']=='run_end' for s in recorder.sent)
    assert not handler.runs


def test_optional_unset_fields_are_omitted_for_ingestion():
    recorder=Recorder()
    recorder.ingest(spanType="llm_call",input="hi",output="ok",parentSpanId=None,traceName=None)
    assert all(value is not None for value in recorder.sent[0].values())
    assert "parentSpanId" not in recorder.sent[0] and "sessionId" not in recorder.sent[0]


def test_langgraph_inside_a_manual_root_uses_its_context():
    recorder=Recorder(); handler=uncoil.langgraph_callback(client=recorder)
    with uncoil.span('outer',root=True,client=recorder):
        handler.on_chain_start({}, {}, run_id='graph-id', name='graph')
        handler.on_chain_end({}, run_id='graph-id')
    child,root=recorder.sent
    assert child['runId']==root['runId'] and child['parentSpanId']==root['spanId']
    assert child['spanType']=='agent' and root['spanType']=='run_end'


def test_anthropic_cache_reads_and_writes_are_counted():
    recorder=Recorder(); body=dict(MESSAGE,usage=dict(input_tokens=8,output_tokens=3,cache_creation_input_tokens=20,cache_read_input_tokens=30))
    raw=Anthropic(api_key='test',http_client=httpx.Client(transport=transport(body)))
    uncoil.wrap_anthropic(raw,client=recorder).messages.create(model='test-model',max_tokens=20,messages=[])
    row=llms(recorder)[0]
    assert row['inputTokens']==58 and row['metadata']['usage']['input_tokens']==8
    raw.close()
