// file: src/lib/errors.ts
// ZATCA SDK - Custom Error Classes

/**
 * Base error class for all ZATCA SDK errors
 */
export class ZATCAError extends Error {
    public readonly code: string;
    public readonly timestamp: Date;

    constructor(message: string, code: string = "ZATCA_ERROR") {
        super(message);
        this.name = "ZATCAError";
        this.code = code;
        this.timestamp = new Date();
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Validation errors for schema/data validation failures
 */
export class ValidationError extends ZATCAError {
    public readonly field?: string;
    public readonly details: Array<{ field: string; message: string }>;

    constructor(
        message: string,
        details: Array<{ field: string; message: string }> = [],
        field?: string
    ) {
        super(message, "VALIDATION_ERROR");
        this.name = "ValidationError";
        this.field = field;
        this.details = details;
    }

    static fromFields(fields: Array<{ field: string; message: string }>) {
        const message = fields.map((f) => `${f.field}: ${f.message}`).join("; ");
        return new ValidationError(`Validation failed: ${message}`, fields);
    }
}

/**
 * Cryptographic operation errors
 */
export class SigningError extends ZATCAError {
    public readonly operation: string;

    constructor(message: string, operation: string = "unknown") {
        super(message, "SIGNING_ERROR");
        this.name = "SigningError";
        this.operation = operation;
    }
}

/**
 * Certificate-related errors
 */
export class CertificateError extends ZATCAError {
    constructor(message: string) {
        super(message, "CERTIFICATE_ERROR");
        this.name = "CertificateError";
    }
}

/**
 * CSR generation errors
 */
export class CSRError extends ZATCAError {
    constructor(message: string) {
        super(message, "CSR_ERROR");
        this.name = "CSRError";
    }
}

/**
 * XML building/parsing errors
 */
export class XMLError extends ZATCAError {
    constructor(message: string) {
        super(message, "XML_ERROR");
        this.name = "XMLError";
    }
}

/**
 * API request/response errors
 */
export class APIError extends ZATCAError {
    public readonly statusCode: number;
    public readonly response?: unknown;
    public readonly zatcaErrors?: Array<{
        code?: string;
        category?: string;
        message: string;
    }>;

    constructor(
        message: string,
        statusCode: number,
        response?: unknown,
        zatcaErrors?: Array<{ code?: string; category?: string; message: string }>
    ) {
        super(message, "API_ERROR");
        this.name = "APIError";
        this.statusCode = statusCode;
        this.response = response;
        this.zatcaErrors = zatcaErrors;
    }

    static fromResponse(
        statusCode: number,
        body: { errors?: Array<{ code?: string; message: string }> }
    ) {
        const errors = body.errors ?? [];
        const message =
            errors.map((e) => e.message).join("; ") ||
            `API request failed with status ${statusCode}`;
        return new APIError(message, statusCode, body, errors);
    }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ZATCAError {
    constructor(message: string) {
        super(message, "CONFIGURATION_ERROR");
        this.name = "ConfigurationError";
    }
}

/**
 * XML processing/canonicalization errors
 */
export class XMLProcessingError extends ZATCAError {
    public readonly operation: string;

    constructor(message: string, operation: string = "unknown") {
        super(message, "XML_PROCESSING_ERROR");
        this.name = "XMLProcessingError";
        this.operation = operation;
    }
}
