import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/lib/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type LoginResponse = {
  access_token: string;
  user_id: string;
  email: string;
  display_name: string;
  organization_id: string;
  organization_name: string;
  role: string;
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export type AgentVersion = {
  id: string;
  agent_id: string;
  version_number: number;
  status: string;
  configuration: Record<string, unknown>;
  published_at: string | null;
};

export type Execution = {
  id: string;
  agent_id: string;
  agent_version_id: string;
  status: string;
  correlation_id: string;
  queued_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  retry_count: number;
  token_usage_total: number;
  estimated_cost_usd: string;
  output_payload?: Record<string, unknown> | null;
  error_details?: Record<string, unknown> | null;
  input_payload?: Record<string, unknown>;
  worker_id?: string | null;
};

export type Member = {
  id: string;
  email: string;
  display_name: string;
  role: string;
};

export type Usage = {
  organization_id: string;
  max_concurrent_executions: number;
  monthly_execution_quota: number;
  monthly_token_quota: number;
  requests_per_minute: number;
  executions_used_month: number;
  tokens_used_month: number;
  executions_remaining: number;
  tokens_remaining: number;
};

export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  revoked_at?: string | null;
};

export type ApiKeyCreated = ApiKey & { api_key: string };

export type AuditLog = {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  created_at: string;
  actor_user_id?: string | null;
};

export const agentmeshApi = createApi({
  reducerPath: "agentmeshApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const session = (getState() as RootState).session;
      if (session.accessToken) {
        headers.set("Authorization", `Bearer ${session.accessToken}`);
      }
      if (session.organizationId) {
        headers.set("X-Organization-Id", session.organizationId);
      }
      return headers;
    },
  }),
  tagTypes: ["Agents", "Executions", "Members", "Me", "ApiKeys", "AuditLogs"],
  endpoints: (builder) => ({
    login: builder.mutation<
      LoginResponse,
      { email: string; password: string; organization_slug?: string }
    >({
      query: (body) => ({
        url: "/api/v1/auth/login",
        method: "POST",
        body: {
          email: body.email,
          password: body.password,
          organization_slug: body.organization_slug ?? "acme",
        },
      }),
    }),
    me: builder.query<
      {
        user_id: string;
        email: string;
        organization_id: string;
        role: string;
        permissions: string[];
      },
      void
    >({
      query: () => "/api/v1/auth/me",
      providesTags: ["Me"],
    }),
    listAgents: builder.query<Agent[], void>({
      query: () => "/api/v1/agents",
      providesTags: ["Agents"],
    }),
    createAgent: builder.mutation<
      Agent,
      { name: string; description: string; configuration?: Record<string, unknown> }
    >({
      query: (body) => ({ url: "/api/v1/agents", method: "POST", body }),
      invalidatesTags: ["Agents"],
    }),
    listVersions: builder.query<AgentVersion[], string>({
      query: (agentId) => `/api/v1/agents/${agentId}/versions`,
    }),
    publishAgent: builder.mutation<AgentVersion, string>({
      query: (agentId) => ({
        url: `/api/v1/agents/${agentId}/publish`,
        method: "POST",
      }),
      invalidatesTags: ["Agents"],
    }),
    listExecutions: builder.query<Execution[], void>({
      query: () => "/api/v1/executions",
      providesTags: ["Executions"],
    }),
    getExecution: builder.query<Execution, string>({
      query: (id) => `/api/v1/executions/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Executions", id }],
    }),
    createExecution: builder.mutation<
      Execution,
      { agent_id: string; input_payload: Record<string, unknown>; idempotencyKey?: string }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/api/v1/executions",
        method: "POST",
        body,
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      }),
      invalidatesTags: ["Executions"],
    }),
    retryExecution: builder.mutation<Execution, string>({
      query: (id) => ({ url: `/api/v1/executions/${id}/retry`, method: "POST" }),
      invalidatesTags: ["Executions"],
    }),
    cancelExecution: builder.mutation<Execution, string>({
      query: (id) => ({ url: `/api/v1/executions/${id}/cancel`, method: "POST" }),
      invalidatesTags: ["Executions"],
    }),
    listMembers: builder.query<Member[], void>({
      query: () => "/api/v1/members",
      providesTags: ["Members"],
    }),
    getUsage: builder.query<Usage, void>({
      query: () => "/api/v1/usage",
    }),
    listApiKeys: builder.query<ApiKey[], void>({
      query: () => "/api/v1/api-keys",
      providesTags: ["ApiKeys"],
    }),
    createApiKey: builder.mutation<ApiKeyCreated, { name: string }>({
      query: (body) => ({ url: "/api/v1/api-keys", method: "POST", body }),
      invalidatesTags: ["ApiKeys"],
    }),
    listAuditLogs: builder.query<AuditLog[], void>({
      query: () => "/api/v1/audit-logs",
      providesTags: ["AuditLogs"],
    }),
  }),
});

export const {
  useLoginMutation,
  useMeQuery,
  useListAgentsQuery,
  useCreateAgentMutation,
  useListVersionsQuery,
  usePublishAgentMutation,
  useListExecutionsQuery,
  useGetExecutionQuery,
  useCreateExecutionMutation,
  useRetryExecutionMutation,
  useCancelExecutionMutation,
  useListMembersQuery,
  useGetUsageQuery,
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useListAuditLogsQuery,
} = agentmeshApi;
