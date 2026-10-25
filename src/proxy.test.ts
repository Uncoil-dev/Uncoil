import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

const originalDeploymentKind = process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND;

afterEach(() => {
  if (originalDeploymentKind === undefined) {
    delete process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND;
  } else {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = originalDeploymentKind;
  }
});

describe("deployment host routing", () => {
  it("keeps the post-region mode selector on the regional cloud host", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const response = proxy(new NextRequest("https://eu.cloud.tracify.tech/cloud/mode?intent=build"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("sends the old demo page and marketing-host demo links to the cloud sandbox", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "marketing";
    expect(proxy(new NextRequest("https://www.tracify.tech/demo")).headers.get("location")).toBe("https://eu.cloud.tracify.tech/demo/project");
    expect(proxy(new NextRequest("https://www.tracify.tech/demo/project/costs")).headers.get("location")).toBe("https://eu.cloud.tracify.tech/demo/project/costs");
  });

  it("serves the demo project on the cloud host", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const response = proxy(new NextRequest("https://eu.cloud.tracify.tech/demo/project/tracing"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps the region directory on the marketing host", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const response = proxy(new NextRequest("https://eu.cloud.tracify.tech/cloud"));

    expect(response.headers.get("location")).toBe("https://www.tracify.tech/cloud");
  });

  it("sends direct production mode requests back through region selection", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "marketing";
    const response = proxy(new NextRequest("https://www.tracify.tech/cloud/mode?intent=build"));

    expect(response.headers.get("location")).toBe("https://www.tracify.tech/cloud?next=%2Fcloud%2Fmode%3Fintent%3Dbuild");
  });

  it("keeps both localhost surfaces available for side-by-side review", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "marketing";
    const response = proxy(new NextRequest("http://localhost:3000/cloud/mode"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("serves the admin area on the cloud host and sends marketing-host visits through region selection", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const cloud = proxy(new NextRequest("https://eu.cloud.tracify.tech/admin/leads"));
    expect(cloud.headers.get("location")).toBeNull();
    expect(cloud.headers.get("x-middleware-next")).toBe("1");

    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "marketing";
    const marketing = proxy(new NextRequest("https://www.tracify.tech/admin"));
    expect(marketing.headers.get("location")).toBe("https://www.tracify.tech/cloud?next=%2Fadmin");
  });

  it("sends a cold visit to the cloud root to sign-in", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const response = proxy(new NextRequest("https://eu.cloud.tracify.tech/"));
    expect(response.headers.get("location")).toBe("https://eu.cloud.tracify.tech/sign-in");
  });

  it("uses the forwarded public host when the server only sees its own bind address", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const headers = { host: "localhost:3000", "x-forwarded-host": "eu.cloud.tracify.tech", "x-forwarded-proto": "https" };

    expect(proxy(new NextRequest("http://localhost:3000/", { headers })).headers.get("location")).toBe("https://eu.cloud.tracify.tech/sign-in");
    expect(proxy(new NextRequest("http://localhost:3000/blog/x", { headers })).headers.get("location")).toBe("https://www.tracify.tech/blog/x");
    expect(proxy(new NextRequest("http://localhost:3000/sign-in", { headers })).headers.get("location")).toBeNull();
  });

  it("still treats a genuine localhost host header as local", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const response = proxy(new NextRequest("http://localhost:3000/", { headers: { host: "localhost:3000" } }));
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps redirects on https when the router reports the request as http", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    const headers = { host: "staging.eu.cloud.tracify.tech", "x-forwarded-proto": "http" };
    const response = proxy(new NextRequest("http://staging.eu.cloud.tracify.tech/", { headers }));
    expect(response.headers.get("location")).toBe("https://staging.eu.cloud.tracify.tech/sign-in");
  });

  it("never sends noindex headers on the public marketing hosts, even from a cloud-flavoured build", () => {
    process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND = "cloud";
    expect(proxy(new NextRequest("https://eu.cloud.tracify.tech/sign-in")).headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(proxy(new NextRequest("https://www.tracify.tech/sign-in", { headers: { "x-forwarded-host": "www.tracify.tech" } })).headers.get("x-robots-tag")).toBeNull();
  });
});
