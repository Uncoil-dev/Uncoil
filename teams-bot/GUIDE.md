# Teams Bot Guide

## Prerequisites
- Node.js 20+
- ngrok account
- Azure subscription with Global Admin access
- Microsoft 365 Teams admin access

---

## 1. Create the Bot

### Azure Bot Resource
1. Go to **Azure Portal → Create a resource → Azure Bot**
2. Fill in:
   - Name: `uncoil-bot`
   - Subscription: your Azure subscription
   - Resource group: `uncoil-rg`
   - Pricing tier: S1 (or Free F0 for testing)
   - **Microsoft App ID**: Create new (generates App Registration automatically)
   - **App type**: MultiTenant
3. Note the **App ID** and create a **Client Secret** in App Registration → Certificates & secrets

### App Registration Settings
1. Go to **Microsoft Entra ID → App registrations → your bot app**
2. **Authentication**: Set **Supported account types** → "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"
3. **API Permissions** → Add: `api.botframework.com` → Application permissions → `user_impersonation` → Grant admin consent

### Azure Bot Configuration
1. Go to **Azure Bot → Configuration**
2. Set **Messaging endpoint**: `https://your-ngrok-url.ngrok-free.dev/api/messages`
3. **App type**: MultiTenant
4. **Microsoft App ID**: your bot's App ID

---

## 2. Setup ngrok

```bash
ngrok http 3978
```

This creates a public URL like `https://xxxx.ngrok-free.dev`. Set this as the Azure Bot messaging endpoint.

---

## 3. Bot Server

### bot.js
```javascript
import { createOpencodeClient } from "@opencode-ai/sdk";
import { BotFrameworkAdapter } from "botbuilder";
import { MicrosoftAppCredentials } from "botframework-connector";
import express from "express";
import fs from "fs";
import path from "path";

const app = express();

const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD,
  channelAuthTenant: process.env.MICROSOFT_APP_TENANT_ID,  // Required for SingleTenant bots
});

const opencode = createOpencodeClient({
  baseUrl: process.env.OPENCODE_URL || "http://localhost:4096",
});

// Persistent sessions
const SESSIONS_FILE = path.resolve("sessions.json");
let sessions = new Map();

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      sessions = new Map(Object.entries(data));
    }
  } catch (_) {}
}
function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(sessions)));
  } catch (_) {}
}
loadSessions();

// Add a reaction (thumbs up)
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

const PORT = process.env.PORT || 3978;
app.listen(PORT, () => {
  console.log(`Azure Bot listening on http://localhost:${PORT}/api/messages`);
});
```

### start-bot.bat
```batch
@echo off
set MICROSOFT_APP_ID=your-app-id
set MICROSOFT_APP_PASSWORD=your-app-secret
set MICROSOFT_APP_TENANT_ID=your-tenant-id
set OPENCODE_URL=http://localhost:4096
cd /d C:\path\to\bot
node bot.js
```

---

## 4. Teams App Package

### manifest.json
```json
{
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "your-bot-app-id",
  "name": {
    "short": "Your Bot Name"
  },
  "developer": {
    "name": "Your Company",
    "websiteUrl": "https://your-site.com",
    "privacyUrl": "https://your-site.com",
    "termsOfUseUrl": "https://your-site.com"
  },
  "description": {
    "short": "Short description"
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#1E1E1E",
  "bots": [
    {
      "botId": "your-bot-app-id",
      "needsChannelSelector": false,
      "isNotificationOnly": false,
      "scopes": ["team", "personal", "groupchat"],
      "supportsFiles": false,
      "supportsCalling": false,
      "supportsVideo": false
    }
  ],
  "validDomains": []
}
```

### Package the app
Zip `manifest.json`, `color.png` (192x192), and `outline.png` (32x32) — all at the root of the zip.

---

## 5. Upload & Install

### Validate
1. Go to https://dev.teams.microsoft.com/tools/store-validation
2. Upload the zip to check for errors

### Upload to Teams
1. **Teams desktop app → Apps → Upload an app → Upload to org catalog**
2. Select your `.zip` file
3. After upload, find the app in Teams → Add → pick your team → select channel

---

## 6. Troubleshooting

### 401 "Authorization has been denied"
- Ensure App Registration is **MultiTenant** (Authentication → Supported account types)
- Set `channelAuthTenant` in BotFrameworkAdapter constructor
- Add `api.botframework.com` API permission and grant admin consent

### "App not found in directory"
- App Registration's supported account type mismatch with Azure Bot's App Type
- Both should be MultiTenant

### Bot not responding
- Check ngrok tunnel is running and URL matches Azure Bot messaging endpoint
- Check bot server logs for errors

---

## Key Files in This Project
| File | Purpose |
|------|---------|
| `C:\uncoil\teams-bot\bot.js` | Bot server code |
| `C:\uncoil\teams-bot\start-bot.bat` | Environment vars + launch script |
| `C:\uncoil\teams-bot\sessions.json` | Persisted opencode session mappings |
| `C:\uncoil\teams-bot\manifest\manifest.json` | Teams app manifest |
| `C:\uncoil\teams-bot\manifest\uncoil-bot.zip` | Packaged Teams app |
| `C:\Users\krist\.config\opencode\opencode.jsonc` | opencode config with Composio MCP |
