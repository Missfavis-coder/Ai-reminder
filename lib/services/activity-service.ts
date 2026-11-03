import { apiClient } from "@/lib/api";

import type {
  ActivityEventInput,
  ActivityEventResponse,
  ActivityEventsResponse,
  ActivityFilters,
  WorkspaceSessionsResponse,
} from "@/lib/types/activity";

function buildQuery(filters: ActivityFilters = {}) {
  const params = new URLSearchParams();

  if (filters.workspaceId) {
    params.set("workspaceId", filters.workspaceId);
  }

  if (filters.period) {
    params.set("period", filters.period);
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  return params.toString();
}

export const activityService = {
  submitEvent(input: ActivityEventInput) {
    return apiClient.post<ActivityEventResponse>(
      "/api/activity/events",
      input,
    );
  },

  async getEvents(
    filters: ActivityFilters = {},
    signal?: AbortSignal,
  ) {
    const query = buildQuery(filters);

    const response = await apiClient.get<ActivityEventsResponse>(
      `/api/activity/events${query ? `?${query}` : ""}`,
      { signal },
    );

    return response.events;
  },

  async getSessions(
    filters: ActivityFilters = {},
    signal?: AbortSignal,
  ) {
    const query = buildQuery(filters);

    const response = await apiClient.get<WorkspaceSessionsResponse>(
      `/api/activity/sessions${query ? `?${query}` : ""}`,
      { signal },
    );

    return response.sessions;
  },
};