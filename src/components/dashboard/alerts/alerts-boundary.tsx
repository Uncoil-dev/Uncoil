"use client";

import { PageTitle } from "@/components/dashboard/page-title";
import { Component, type ReactNode } from "react";

/** Shows a calm message if the alert backend functions are not deployed yet, instead of crashing the page. */
export class AlertsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-svh bg-[#0B0D10] p-6 text-[13px] text-[#E6E9EE]" role="alert">
        <PageTitle>Alerts</PageTitle>
        <p className="mt-2 max-w-md text-[#8B93A1]">Alerts are being set up for this workspace. Try again in a few minutes.</p>
        <button type="button" onClick={() => this.setState({ failed: false })} className="mt-4 h-8 border border-[#262C35] px-3 text-[#8B93A1] hover:text-[#E6E9EE]">Try again</button>
      </div>
    );
  }
}
