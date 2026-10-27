export function getBaseUrl(): string {
    if (typeof window !== "undefined") return "";
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:7011";
  }
  
  export function getApiPath(path: string): string {
    return `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  }
  
  export function getGaMeasurementId(): string | null {
    if (process.env.NODE_ENV !== "production") return null;
    const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!id || !id.startsWith("G-")) return null;
    return id;
  }
  
  export function getGoogleSiteVerification(): string | null {
    const token = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
    if (!token) return null;
    return token;
  }
  