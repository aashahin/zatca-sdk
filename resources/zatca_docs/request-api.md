# e-Invoicing Sandbox Release (2.1.0) 1.0.0 OAS3
Version: 1.0.0

ZATCA wants to provide Taxpayers and Developers of Taxpayer e-invoicing solutions and devices the opportunity to test the integration of the systems with a ZATCA Sandbox environment prior to the launch of the production system. The Integration Sandbox (ISB) should enable solution developers to simulate the integration calls/requests that will be required later as part of the registration process and the submission of e-invoices, credit and debit notes to the production system. The Sandbox backend will accordingly simulate the validations and responses as part of the Cryptographic Stamp Identifiers issuance, renewal and revocation as well as the Reporting and Clearance function.

Although the ISB will give ZATCA an indication of the adoption rate for e-invoicing solutions in the market, it will not be mandatory to complete Sandbox testing as a pre-requisite for Registration/Taxpayer onboarding or accessing the production system. Similar to the Compliance and Enablement Toolbox (CET), the ISB is also aimed at Developers to build/update their solutions which are in line with ZATCA specifications and standards and are able to integrate with a ZATCA backend. Accordingly access to the ISB test/mock APIs will not be limited to Taxpayers and any user can register for a Developer account to access the ISB test/mock APIs and associated documentation. This registration will enable ZATCA to monitor the solution providers who intent to develop/update their solutions to integrate with ZATCA.

It should be noted that although the ISB will simulate most of the core functionalities of the production system, any validations that require integrations/access with external systems and/or storage as well as scenarios involving any backend exceptional handling (for example overriding the clearance process) will not be part of the ISB and will be covered by the core solution. Accordingly the ISB should not be considered as representative of all integrations and/or APIs that will be part of the production system.

This swagger documents the set of apis for the Sandbox (ISB) solution.

Developers can also refer to section 2.3.10 of the Developer Portal User Manual for additional guidance and steps.

## Servers

- `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal`

---

## POST /production/csids

Issues an X509 Production Cryptographic Stamp Identifier (PCSID/Certificate) (CSID) based on submitted CSR.

This Production CSID is a simulation of ZATCA rootCA moreover it is used to sign einvoice documents and authenticate einvoicing api calls. Specifically, it is sent via the authentication header for those api calls. This Production CSID is a simulation of ZATCA rootCA moreover it is used to sign einvoice documents and authenticate einvoicing api calls. Specifically, it is sent via the authentication header for those api calls.

### Parameters

| Name | Type | Location | Description |
|---|---|---|---|
| Authorization | string | header | Username (Compliance Certificate ) and Password (Secret) should be taken from the Compliance certifi |
| Accept-Version * | string | header | |

### Request Body Example

```json
{
  "compliance_request_id": "1234567890123"
}
```

### Responses

#### 200: Success
Returns a Base64 encoded X509 certificate.

```json
{
  "requestID": 1642424139872,
  "dispositionMessage": "ISSUED",
  "binarySecurityToken": "TUlJRDNqQ0NBNFNnQXdJQkFnSVRFUUFBT0FQRjkwQWpzL3hjWHdBQkFBQTRBekFLQmdncWhrak9QUVFEQWpCaU1SVXdFd1lLQ1pJbWlaUHlMR1FCR1JZRmJHOWpZV3d4RXpBUkJnb0praWFKay9Jc1pBRVpGZ05uYjNZeEZ6QVZCZ29Ka2lhSmsvSXNaQUVaRmdkbGVIUm5ZWHAwTVJzd0dRWURWUVFERXhKUVVscEZTVTVXVDBsRFJWTkRRVFF0UTBFd0hoY05NalF3TVRFeE1Ea3hPVE13V2hjTk1qa3dNVEE1TURreE9UTXdXakIxTVFzd0NRWURWUVFHRXdKVFFURW1NQ1FHQTFVRUNoTWRUV0Y0YVcxMWJTQlRjR1ZsWkNCVVpXTm9JRk4xY0hCc2VTQk1WRVF4RmpBVUJnTlZCQXNURFZKcGVXRmthQ0JDY21GdVkyZ3hKakFrQmdOVkJBTVRIVlJUVkMwNE9EWTBNekV4TkRVdE16azVPVGs1T1RrNU9UQXdNREF6TUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVvV0NLYTBTYTlGSUVyVE92MHVBa0MxVklLWHhVOW5QcHgydmxmNHloTWVqeThjMDJYSmJsRHE3dFB5ZG84bXEwYWhPTW1Obzhnd25pN1h0MUtUOVVlS09DQWdjd2dnSURNSUd0QmdOVkhSRUVnYVV3Z2FLa2daOHdnWnd4T3pBNUJnTlZCQVFNTWpFdFZGTlVmREl0VkZOVWZETXRaV1F5TW1ZeFpEZ3RaVFpoTWkweE1URTRMVGxpTlRndFpEbGhPR1l4TVdVME5EVm1NUjh3SFFZS0NaSW1pWlB5TEdRQkFRd1BNems1T1RrNU9UazVPVEF3TURBek1RMHdDd1lEVlFRTURBUXhNVEF3TVJFd0R3WURWUVFhREFoU1VsSkVNamt5T1RFYU1CZ0dBMVVFRHd3UlUzVndjR3g1SUdGamRHbDJhWFJwWlhNd0hRWURWUjBPQkJZRUZFWCtZdm1tdG5Zb0RmOUJHYktvN29jVEtZSzFNQjhHQTFVZEl3UVlNQmFBRkp2S3FxTHRtcXdza0lGelZ2cFAyUHhUKzlObk1Ic0dDQ3NHQVFVRkJ3RUJCRzh3YlRCckJnZ3JCZ0VGQlFjd0FvWmZhSFIwY0RvdkwyRnBZVFF1ZW1GMFkyRXVaMjkyTG5OaEwwTmxjblJGYm5KdmJHd3ZVRkphUlVsdWRtOXBZMlZUUTBFMExtVjRkR2RoZW5RdVoyOTJMbXh2WTJGc1gxQlNXa1ZKVGxaUFNVTkZVME5CTkMxRFFTZ3hLUzVqY25Rd0RnWURWUjBQQVFIL0JBUURBZ2VBTUR3R0NTc0dBUVFCZ2pjVkJ3UXZNQzBHSlNzR0FRUUJnamNWQ0lHR3FCMkUwUHNTaHUyZEpJZk8reG5Ud0ZWbWgvcWxaWVhaaEQ0Q0FXUUNBUkl3SFFZRFZSMGxCQll3RkFZSUt3WUJCUVVIQXdNR0NDc0dBUVVGQndNQ01DY0dDU3NHQVFRQmdqY1ZDZ1FhTUJnd0NnWUlLd1lCQlFVSEF3TXdDZ1lJS3dZQkJRVUhBd0l3Q2dZSUtvWkl6ajBFQXdJRFNBQXdSUUloQUxFL2ljaG1uV1hDVUtVYmNhM3ljaThvcXdhTHZGZEhWalFydmVJOXVxQWJBaUE5aEM0TThqZ01CQURQU3ptZDJ1aVBKQTZnS1IzTEUwM1U3NWVxYkMvclhBPT0=",
  "secret": "SX3P87hpTma5qUsOEQWv46fHL9uGcKFow90i9ercnSY="
}
```

#### 400: Bad Request
HTTP Bad Request. Returned when the submitted request is invalid.

```json
{
  "errors": [
    {
      "code": "Missing-ComplianceSteps",
      "message": "Compliance steps for this CSID are not yet complete"
    }
  ]
}
```

#### 401: Unauthorized
Returned when username and password are not added or added as wrong values.

```json
{
  "timestamp": 1654514661409,
  "status": 401,
  "error": "Unauthorized",
  "message": ""
}
```

#### 406: Not Acceptable

```text
This Version is not supported or not provided in the header.
```

#### 500: Internal Server Error
HTTP Internal Server Error. Returned when the service faces internal errors.

```json
{
  "code": "Invalid-Request",
  "message": "System failed to process your request"
}
```

---

## Schemas

### InfoModel

An object representing the result of the clearance or reporting API endpoints when the clearance flag is turned on or off. Basically, it shows an informational message instructing the client to see the other api.

| Property | Type | Description |
|---|---|---|
| message | string | |

### ErrorModel

An object representing the structure of the error object returned by the API endpoints. Specifically, it includes the Category of the error, its code and message.

| Property | Type | Description |
|---|---|---|
| category | string | |
| code | string | |
| message | string | |

### WarningModel

An object representing the structure of the warning object returned by the API endpoints. Specifically, it includes the Category of the warning, its code and message.

| Property | Type | Description |
|---|---|---|
| category | string | |
| code | string | |
| message | string | |

### InvoiceResultModel

An Object the represents the response of the API endpoint where it shows the results including status, warnings (if any), and error (if any) in addition to the submitted document hash.

| Property | Type | Description |
|---|---|---|
| invoiceHash | string | |
| status | string (enum) | |
| warnings | array of WarningModel | Array of warnings (if any) |
| erros | array of ErrorModel | Array of errors (if any) |

### ClearedInvoiceResultModel

An object representing the structure of the clearance endpoint response. Specifically, it is an object that contains the hash of the document, status, the cleared document, warnings (if any), and errors (if any).

| Property | Type | Description |
|---|---|---|
| invoiceHash | string | |
| clearedInvoice | string | |
| status | string (enum) | |
| warnings | array of WarningModel | Array of warnings (if any) |
| erros | array of ErrorModel | Array of errors (if any) |

### InvoiceRequest

An object representing the structure of the clearance endpoint request. Specifically, it has the submitted document hash and the base64 representation of the invoice.

| Property | Type | Description |
|---|---|---|
| invoiceHash | string | |
| invoice | string | |

### CSRRequest

An object representing the structure of the CSR request that is used to generate a CSID.

| Property | Type | Description |
|---|---|---|
| csr | string | |

### CertificatesErrorsResponse

| Property | Type | Description |
|---|---|---|
| errors | array of ErrorModel | Array of errors returned during certificate request. |