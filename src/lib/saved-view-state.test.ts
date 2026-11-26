import { expect, test } from "vitest";
import {savedViewQuery,savedViewColumns,columnsFromUrl,savedViewState,readSavedViewRequest} from "./saved-view-state";
test("snapshots omit transient selections and remain deterministic",()=>{expect(savedViewQuery({q:"hello",trace:"run",page:"3",range:"7d",savedView:"id"})).toEqual({q:"hello",range:"7d"});expect(savedViewState({q:"a",range:"7d"},["cost"])).toBe(savedViewState({range:"7d",q:"a"},["cost"]));});
test("shared columns are bounded, validated and preserve metadata order",()=>{const columns=savedViewColumns(["cost","name","unknown","meta:x' OR 1=1",...Array.from({length:30},(_,i)=>`meta:k${i}`)]);expect(columns).not.toContain("unknown");expect(columns).not.toContain("meta:x' OR 1=1");expect(columns.filter(v=>v.startsWith("meta:"))).toHaveLength(20);expect(columnsFromUrl("not-json")).toBeNull();expect(columnsFromUrl(JSON.stringify(["cost","name"]))).toEqual(["name","cost"]);});

test("long checkbox selections and new search exclusions survive snapshots",()=>{const value=Array.from({length:30},(_,i)=>`model-${i}`).join(",");expect(savedViewQuery({modelId:value,not_environment:"dev",minTokens:"50",maxTokens:"1000"})).toEqual({modelId:value,not_environment:"dev",minTokens:"50",maxTokens:"1000"});});

const savedViewPost=(body:string)=>new Request("https://app.test/api/projects/p/saved-views",{method:"POST",body});
test("save requests explain a bad body or a missing name before reaching the backend",async()=>{
  expect(await readSavedViewRequest(savedViewPost("{not json"))).toEqual({error:"Invalid JSON body"});
  expect(await readSavedViewRequest(savedViewPost(JSON.stringify({name:"  ",target:"runs"})))).toEqual({error:"Give the view a name"});
  expect(await readSavedViewRequest(savedViewPost(JSON.stringify({target:"runs"})))).toEqual({error:"Give the view a name"});
  expect(await readSavedViewRequest(savedViewPost(JSON.stringify({action:"delete",id:"v1"})))).toEqual({body:{action:"delete",id:"v1"}});
  expect(await readSavedViewRequest(savedViewPost(JSON.stringify({name:"Slow runs"})))).toEqual({body:{name:"Slow runs"}});
});
