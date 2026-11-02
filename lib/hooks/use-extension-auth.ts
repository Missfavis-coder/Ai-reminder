
"use client";

import { useMutation } from "@tanstack/react-query";
import { extensionAuthService } from "@/lib/services/extension-auth-service";

export function useApproveExtensionAuth() {
  return useMutation({
    mutationFn: extensionAuthService.approve,
  });
}
