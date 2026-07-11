// file: src/lib/api/client.ts
// ZATCA SDK - HTTP client for the ZATCA e-invoicing APIs

import { APIError, ConfigurationError } from "../errors";
import { ZATCA_URLS, type ZATCAEnvironment, type Result } from "../types";

export interface APIClientConfig {
    env: ZATCAEnvironment;
    /**
     * Basic-auth username: the binarySecurityToken EXACTLY as returned by the
     * CSID endpoints (do not decode it — the API expects the raw token).
     */
    certificate?: string;
    /** ZATCA-issued secret */
    secret?: string;
    /** Language for validation messages */
    language?: "ar" | "en";
    /** Request timeout in milliseconds (default 30000) */
    timeoutMs?: number;
}

/**
 * ZATCA API client. Handles auth headers, versioning, and error mapping.
 */
export class ZATCAAPIClient {
    readonly env: ZATCAEnvironment;
    private readonly baseUrl: string;
    private readonly language: string;
    private readonly timeoutMs: number;
    private certificate?: string;
    private secret?: string;

    constructor(config: APIClientConfig) {
        this.env = config.env;
        this.baseUrl = ZATCA_URLS[config.env];
        this.language = config.language ?? "en";
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.certificate = config.certificate;
        this.secret = config.secret;
    }

    /** Swap credentials after obtaining or renewing a CSID */
    updateCredentials(certificate: string, secret: string): void {
        this.certificate = certificate;
        this.secret = secret;
    }

    hasCredentials(): boolean {
        return Boolean(this.certificate && this.secret);
    }

    private getHeaders(authenticated: boolean): Record<string, string> {
        const headers: Record<string, string> = {
            "Accept-Version": "V2",
            "Accept-Language": this.language,
            "Content-Type": "application/json",
            Accept: "application/json",
        };
        if (authenticated) {
            if (!this.certificate || !this.secret) {
                throw new ConfigurationError(
                    "Certificate and secret are required for authenticated requests. " +
                        "Complete onboarding first or call updateCredentials().",
                );
            }
            headers["Authorization"] =
                `Basic ${Buffer.from(`${this.certificate}:${this.secret}`).toString("base64")}`;
        }
        return headers;
    }

    async request<T>(
        method: "GET" | "POST" | "PATCH",
        endpoint: string,
        options: {
            body?: unknown;
            headers?: Record<string, string>;
            authenticated?: boolean;
        } = {},
    ): Promise<Result<T>> {
        const { body, headers: extraHeaders, authenticated = true } = options;

        let headers: Record<string, string>;
        try {
            headers = { ...this.getHeaders(authenticated), ...extraHeaders };
        } catch (error) {
            return { success: false, error: error as ConfigurationError };
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(this.timeoutMs),
            });

            const responseText = await response.text();
            let responseData: unknown;
            try {
                responseData = JSON.parse(responseText);
            } catch {
                responseData = responseText;
            }

            if (!response.ok) {
                return { success: false, error: this.mapError(response.status, responseData) };
            }
            return { success: true, data: responseData as T };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            const isTimeout = error instanceof Error && error.name === "TimeoutError";
            return {
                success: false,
                error: new APIError(
                    isTimeout ? `Request timed out after ${this.timeoutMs}ms` : `Network error: ${message}`,
                    0,
                ),
            };
        }
    }

    private mapError(status: number, body: unknown): APIError {
        if (status === 401) {
            return new APIError(
                "Authentication failed — invalid binarySecurityToken or secret",
                401,
                body,
            );
        }
        if (status === 406) {
            return new APIError(
                "Not acceptable — check the Accept-Version header (must be V2)",
                406,
                body,
            );
        }

        // ZATCA 400s carry validationResults; surface their messages
        const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
        const validationResults = record.validationResults as
            | { errorMessages?: Array<{ code?: string; message: string }> }
            | undefined;
        const errorMessages =
            validationResults?.errorMessages ??
            (record.errors as Array<{ code?: string; message: string }> | undefined) ??
            [];
        const detail = errorMessages
            .map((e) => (e.code ? `${e.code}: ${e.message}` : e.message))
            .join("; ");

        return new APIError(
            detail || `ZATCA API request failed with status ${status}`,
            status,
            body,
            errorMessages,
        );
    }

    async post<T>(
        endpoint: string,
        body: unknown,
        options: { headers?: Record<string, string>; authenticated?: boolean } = {},
    ): Promise<Result<T>> {
        return this.request<T>("POST", endpoint, { ...options, body });
    }

    async patch<T>(
        endpoint: string,
        body: unknown,
        options: { headers?: Record<string, string>; authenticated?: boolean } = {},
    ): Promise<Result<T>> {
        return this.request<T>("PATCH", endpoint, { ...options, body });
    }
}

export function createAPIClient(config: APIClientConfig): ZATCAAPIClient {
    return new ZATCAAPIClient(config);
}
