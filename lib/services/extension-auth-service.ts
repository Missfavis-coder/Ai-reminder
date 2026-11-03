
import { apiClient } from "@/lib/api";

interface ApproveExtensionAuthInput {
  requestId: string;
}

interface ApproveExtensionAuthResponse {
  approved: boolean;
}

export const extensionAuthService = {
  async approve(
    input: ApproveExtensionAuthInput,
  ): Promise<ApproveExtensionAuthResponse> {
    return apiClient.post<ApproveExtensionAuthResponse>(
      "/api/extension-auth/approve",
      input,
    );
  },
};
