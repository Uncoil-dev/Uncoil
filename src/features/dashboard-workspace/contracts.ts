export type WorkspaceMode = "live" | "sandbox";

export type WorkspaceRegion = "eu" | "us";

export type WorkspaceSurface =
  | "home"
  | "dashboards"
  | "costs"
  | "tracing"
  | "sessions"
  | "users"
  | "alerts"
  | "prompts"
  | "playground"
  | "scores"
  | "evaluators"
  | "annotation-queues"
  | "datasets"
  | "experiments"
  | "settings";

export type WorkspaceRecord = {
  id: string;
  name: string;
  traceName?: string;
  status: string;
  environment: string;
  timestamp: string;
  latency?: string;
  cost?: string;
  model?: string;
  score?: string;
  userId?: string;
  sessionId?: string;
  input?: string;
  output?: string;
};

export type WorkspaceCollection = {
  description: string;
  records: WorkspaceRecord[];
};

export type DashboardWorkspaceData = {
  project: {
    id: string;
    name: string;
    organizationName: string;
  };
  mode: WorkspaceMode;
  readOnly: boolean;
  region: WorkspaceRegion;
  metrics: {
    traces: number;
    observations: number;
    totalCost: number;
    scores: number;
  };
  environments: string[];
  models: string[];
  collections: Record<Exclude<WorkspaceSurface, "home" | "settings">, WorkspaceCollection>;
};

export type DashboardWorkspace = DashboardWorkspaceData & {
  dataSource: "uncoil-live" | "uncoil-sandbox";
};
