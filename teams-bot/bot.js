import { createOpencodeClient } from "@opencode-ai/sdk";
import { BotFrameworkAdapter } from "botbuilder";
import { MicrosoftAppCredentials } from "botframework-connector";
import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const TEAM_ID = "19fb0b36-9d03-490c-a294-5a3ffec0da58";
const ALLOWED_CHANNELS = ["Team Uncoil Devs"];
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const NGROK_URL = "https://dried-encrust-scoop.ngrok-free.dev";
let channelList = [];

let graphSubscriptionId = null;

async function getGraphToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_APP_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_APP_ID,
        client_secret: process.env.MICROSOFT_APP_PASSWORD,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  const data = await res.json();
  if (data.access_token) return data.access_token;
  throw new Error(`Token error: ${data.error} ${data.error_description}`);
}

async function createGraphSubscription() {
  const token = await getGraphToken();
  const body = {
    changeType: "created",
    notificationUrl: `${NGROK_URL}/api/graph-webhook`,
    resource: `/teams/${TEAM_ID}/channels/${encodeURIComponent(CHANNEL_ID)}/messages`,
    expirationDateTime: new Date(Date.now() + 55 * 60 * 1000).toISOString(), // 55 min
    clientState: "uncoil-bot",
  };
  const res = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) {
    graphSubscriptionId = data.id;
    console.log(`[${new Date().toISOString()}] Graph subscription created: ${data.id}`);
  } else {
    console.error(`[${new Date().toISOString()}] Graph subscription error:`, JSON.stringify(data));
  }
  return data;
}

async function renewGraphSubscription() {
  if (!graphSubscriptionId) return;
  const token = await getGraphToken();
  const body = {
    expirationDateTime: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
  };
  const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${graphSubscriptionId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    console.log(`[${new Date().toISOString()}] Graph subscription renewed`);
  } else {
    const data = await res.json();
    console.error(`[${new Date().toISOString()}] Graph renewal error:`, JSON.stringify(data));
    // Recreate if renewal fails
    await createGraphSubscription();
  }
}

async function processMessageFromGraph(msg, serviceUrl, parentMsgId) {
  const body = msg.body?.content || "";
  if (!body) return;
  const fromUser = msg.from?.user;
  if (!fromUser?.id) return;
  const botId = process.env.MICROSOFT_APP_ID;
  if (fromUser.id === botId) return;

  const conversationId = msg.channelIdentity?.channelId;
  const targetId = parentMsgId || msg.id;
  const threadConvId = `${conversationId};messageid=${targetId}`;

  const convRef = conversationId;
  if (!sessions.has(convRef)) {
    try {
      const s = await opencode.session.create({ body: { title: `Teams: ${convRef}` } });
      sessions.set(convRef, s.data.id);
      saveSessions();
    } catch (_) {}
  }

  const sessionId = sessions.get(convRef);
  if (!sessionId) return;

  console.log(`[${new Date().toISOString()}] Processing msg ${msg.id}: "${body.slice(0,30)}"`);

  try {
    const creds = new MicrosoftAppCredentials(
      botId, process.env.MICROSOFT_APP_PASSWORD, process.env.MICROSOFT_APP_TENANT_ID
    );
    const token = await creds.getToken();
    const baseUrl = (serviceUrl || "https://smba.trafficmanager.net/no/").replace(/\/+$/, "") + "/";
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const sendToConv = async (activity) => {
      await fetch(`${baseUrl}v3/conversations/${encodeURIComponent(threadConvId)}/activities`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...activity, from: { id: botId, name: "Team Uncoil" } }),
      });
    };

    await sendToConv({ type: "typing" }).catch(() => {});

    const result = await opencode.session.prompt({
      path: { id: sessionId },
      body: { parts: [{ type: "text", text: body }], agent: "general" },
    });

    const reply = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    if (reply) {
      await sendToConv({ type: "message", text: reply, replyToId: targetId });
    }

    await fetch(`${baseUrl}v3/conversations/${encodeURIComponent(threadConvId)}/activities/${encodeURIComponent(msg.id)}/reactions`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ type: "like" }]),
    }).catch(() => {});

    console.log(`[${new Date().toISOString()}] Replied to msg ${msg.id} (target ${targetId})`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Graph message error:`, err.message);
  }
}

const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD,
  channelAuthTenant: process.env.MICROSOFT_APP_TENANT_ID,
});

const opencode = createOpencodeClient({
  baseUrl: process.env.OPENCODE_URL || "http://localhost:4096",
});

const SESSIONS_FILE = path.resolve("sessions.json");
let sessions = new Map();
let replyTracking = {};
let lastMessageIds = {};

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      sessions = new Map(Object.entries(raw.sessions || raw));
      replyTracking = raw.replyTracking || {};
      lastMessageIds = raw.lastMessageIds || {};
    }
  } catch (_) {}
}
function saveSessions() {
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: Object.fromEntries(sessions), replyTracking, lastMessageIds })); } catch (_) {}
}
loadSessions();

async function addReaction(ctx, activityId, reactionType = "like") {
  try {
    const creds = new MicrosoftAppCredentials(
      process.env.MICROSOFT_APP_ID,
      process.env.MICROSOFT_APP_PASSWORD,
      process.env.MICROSOFT_APP_TENANT_ID
    );
    const token = await creds.getToken();
    const url = `${ctx.activity.serviceUrl}v3/conversations/${ctx.activity.conversation.id}/activities/${activityId}/reactions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ type: reactionType }]),
    });
    if (!res.ok) console.error("Reaction error:", res.status);
  } catch (err) {
    console.error("Reaction error:", err.message);
  }
}

async function handleTurn(ctx) {
  const text = ctx.activity.text?.trim();
  if (!text) return;

  const convRef = ctx.activity.conversation?.id || "default";

  if (!sessions.has(convRef)) {
    const s = await opencode.session.create({
      body: { title: `Teams: ${convRef}` },
    });
    sessions.set(convRef, s.data.id);
    saveSessions();
  }

  const sessionId = sessions.get(convRef);

  try {
    await ctx.sendActivity({ type: "typing" });
  } catch (_) {}

  try {
    const result = await opencode.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text }],
        agent: "general",
      },
    });

    const reply = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    if (reply) {
      const activity = { text: reply };
      if (ctx.activity.replyToId) {
        activity.replyToId = ctx.activity.replyToId;
      }
      await ctx.sendActivity(activity);
    }

    await addReaction(ctx, ctx.activity.id);
  } catch (err) {
    console.error("opencode error:", err);
    await ctx.sendActivity("Failed to reach opencode server.");
  }
}

adapter.onTurnError = async (ctx, err) => {
  console.error("Turn error:", err);
};

app.post("/api/messages", (req, res) => {
  adapter.processActivity(req, res, handleTurn).catch((err) => {
    console.error("Auth error:", err.message);
    res.status(200).end();
  });
});

app.post("/api/webhook", async (req, res) => {
  const body = req.body || {};
  const started = Date.now();
  console.log(`[${new Date().toISOString()}] Webhook received:`, JSON.stringify(body).slice(0, 500));
  const { text, conversationId, serviceUrl, fromId, fromName, tenantId, messageId } = body;
  if (!text || !conversationId || !serviceUrl) {
    console.log(`[${new Date().toISOString()}] Missing fields, returning 200 to avoid retry`);
    return res.status(200).end();
  }

  const botId = process.env.MICROSOFT_APP_ID;
  if (!fromId || fromId === botId) return res.status(200).end();

  const convRef = conversationId;
  const threadId = messageId ? `${conversationId};messageid=${messageId}` : conversationId;

  if (!sessions.has(convRef)) {
    try {
      const s = await opencode.session.create({ body: { title: `Teams: ${convRef}` } });
      sessions.set(convRef, s.data.id);
      saveSessions();
    } catch (_) {}
  }

  const sessionId = sessions.get(convRef);
  if (!sessionId) return res.status(200).end();

  try {
    const creds = new MicrosoftAppCredentials(
      botId, process.env.MICROSOFT_APP_PASSWORD, process.env.MICROSOFT_APP_TENANT_ID
    );
    const token = await creds.getToken();

    const baseUrl = serviceUrl.endsWith("/") ? serviceUrl : serviceUrl + "/";
    const baseHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const sendToThread = async (activity) => {
      const res = await fetch(`${baseUrl}v3/conversations/${encodeURIComponent(threadId)}/activities`, {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({ ...activity, from: { id: botId, name: "Team Uncoil" } }),
      });
      return res;
    };

    await sendToThread({ type: "typing" }).catch(() => {});

    const t0 = Date.now();
    const result = await opencode.session.prompt({
      path: { id: sessionId },
      body: { parts: [{ type: "text", text }], agent: "general" },
    });
    console.log(`[${new Date().toISOString()}] opencode prompt took ${Date.now() - t0}ms`);

    const reply = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    if (reply) {
      await sendToThread({ type: "message", text: reply, replyToId: messageId });
    }

    await fetch(`${baseUrl}v3/conversations/${encodeURIComponent(threadId)}/activities/${encodeURIComponent(messageId)}/reactions`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify([{ type: "like" }]),
    }).catch(() => {});
  } catch (err) {
    console.error("Webhook error:", err.message);
  }

  console.log(`[${new Date().toISOString()}] Webhook total: ${Date.now() - started}ms`);
  res.status(200).end();
});

app.post("/api/messages", (req, res) => {
  adapter.processActivity(req, res, handleTurn).catch((err) => {
    console.error("Auth error:", err.message);
    res.status(200).end();
  });
});

// --- Graph API webhook ---

function handleGraphValidation(req, res) {
  const validationToken = req.query.validationToken;
  if (validationToken) {
    res.set("Content-Type", "text/plain");
    return res.status(200).send(validationToken);
  }
  res.status(400).end();
}

app.get("/api/graph-webhook", handleGraphValidation);

let graphPostHandler = app.post("/api/graph-webhook", (req, res, next) => {
  if (req.query.validationToken) return handleGraphValidation(req, res);
  next();
});

app.post("/api/graph-webhook", async (req, res) => {
  console.log(`[${new Date().toISOString()}] Graph POST body:`, JSON.stringify(req.body).slice(0, 1000));
  res.status(202).end();
  const notifications = req.body?.value || [];
  for (const notif of notifications) {
    console.log(`[${new Date().toISOString()}] Graph notif:`, JSON.stringify(notif).slice(0, 500));
    if (notif.resourceData?.["@odata.type"] !== "#Microsoft.Graph.ChatMessage") {
      console.log("Skipping - not a chat message");
      continue;
    }
    const messageId = notif.resourceData?.id;
    if (!messageId) continue;

    try {
      const token = await getGraphToken();
      const resource = notif.resource;
      const res = await fetch(`https://graph.microsoft.com/v1.0/${resource}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const msg = await res.json();
        await processMessageFromGraph(msg, "https://smba.trafficmanager.net/no/");
      } else {
        console.error(`[${new Date().toISOString()}] Graph fetch error: ${res.status}`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Graph notification error:`, err.message);
    }
  }
});

async function findOrCreateSubscription() {
  try {
    const token = await getGraphToken();
    const listRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const encodedChannel = encodeURIComponent(CHANNEL_ID);
    const sub = list.value?.find((s) =>
      s.resource?.includes(encodedChannel) && s.notificationUrl?.includes(NGROK_URL)
    );
    if (sub) {
      graphSubscriptionId = sub.id;
      console.log(`[${new Date().toISOString()}] Reusing existing subscription: ${sub.id}`);
      return;
    }
  } catch (_) {}
  await createGraphSubscription();
}

// Poll Graph API every 5 seconds for new messages

async function refreshChannels(token) {
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/channels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    channelList = (data.value || []).filter(c => c.id && ALLOWED_CHANNELS.includes(c.displayName));
  } catch (_) {}
}

async function pollRepliesFor(channelId, parentMsg, token) {
  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(parentMsg.id)}/replies?\$top=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    const replies = data.value || [];
    if (replies.length === 0) return;
    const parentLastId = (replyTracking[channelId] || {})[parentMsg.id];
    for (const reply of replies.reverse()) {
      if (parentLastId && reply.id <= parentLastId) continue;
      if (!reply.body?.content) continue;
      const fromUser = reply.from?.user;
      if (!fromUser?.id) continue;
      if (fromUser.id === process.env.MICROSOFT_APP_ID) continue;
      if (!replyTracking[channelId]) replyTracking[channelId] = {};
      replyTracking[channelId][parentMsg.id] = reply.id;
      saveSessions();
      await processMessageFromGraph(reply, "https://smba.trafficmanager.net/no/", parentMsg.id);
    }
  } catch (_) {}
}

async function pollMessages() {
  try {
    const token = await getGraphToken();
    if (channelList.length === 0) await refreshChannels(token);
    console.log(`[${new Date().toISOString()}] Polling ${channelList.length} channels...`);
    for (const ch of channelList) {
      const url = `https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/channels/${encodeURIComponent(ch.id)}/messages?\$top=5`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { console.log(`[${new Date().toISOString()}] Ch ${ch.displayName} fetch ${res.status}`); continue; }
      const data = await res.json();
      const topMsgs = data.value || [];
      const msgs = [...topMsgs];
      const lastId = lastMessageIds[ch.id];
      if (msgs.length > 0) console.log(`[${new Date().toISOString()}] Ch ${ch.displayName}: ${msgs.length} msgs, lastId=${lastId}`);
      for (const msg of msgs.reverse()) {
        if (lastId && msg.id <= lastId) continue;
        if (!msg.body?.content) continue;
        const fromUser = msg.from?.user;
        if (!fromUser?.id) continue;
        if (fromUser.id === process.env.MICROSOFT_APP_ID) continue;
        if (!lastId) { lastMessageIds[ch.id] = msg.id; continue; }
        lastMessageIds[ch.id] = msg.id;
        await processMessageFromGraph(msg, "https://smba.trafficmanager.net/no/");
      }
      if (msgs.length > 0 && !lastMessageIds[ch.id]) {
        lastMessageIds[ch.id] = msgs[msgs.length - 1].id;
      }
      for (const parentMsg of topMsgs.slice(0, 3)) {
        if (parentMsg.from?.user?.id === process.env.MICROSOFT_APP_ID) continue;
        await pollRepliesFor(ch.id, parentMsg, token);
      }
    }
  } catch (_) {}
}

const PORT = process.env.PORT || 3978;
app.listen(PORT, () => {
  console.log(`Azure Bot listening on http://localhost:${PORT}/api/messages`);
  pollMessages();
  setInterval(pollMessages, 5000);
});
