# e-Invoicing Sandbox Release (2.1.0) 1.0.0 OAS3

Version: 1.0.0

ZATCA wants to provide Taxpayers and Developers of Taxpayer e-invoicing solutions and devices the opportunity to test the integration of the systems with a ZATCA Sandbox environment prior to the launch of the production system. The Integration Sandbox (ISB) should enable solution developers to simulate the integration calls/requests that will be required later as part of the registration process and the submission of e-invoices, credit and debit notes to the production system. The Sandbox backend will accordingly simulate the validations and responses as part of the Cryptographic Stamp Identifiers issuance, renewal and revocation as well as the Reporting and Clearance function.

Although the ISB will give ZATCA an indication of the adoption rate for e-invoicing solutions in the market, it will not be mandatory to complete Sandbox testing as a pre-requisite for Registration/Taxpayer onboarding or accessing the production system. Similar to the Compliance and Enablement Toolbox (CET), the ISB is also aimed at Developers to build/update their solutions which are in line with ZATCA specifications and standards and are able to integrate with a ZATCA backend. Accordingly access to the ISB test/mock APIs will not be limited to Taxpayers and any user can register for a Developer account to access the ISB test/mock APIs and associated documentation. This registration will enable ZATCA to monitor the solution providers who intent to develop/update their solutions to integrate with ZATCA.

It should be noted that although the ISB will simulate most of the core functionalities of the production system, any validations that require integrations/access with external systems and/or storage as well as scenarios involving any backend exceptional handling (for example overriding the clearance process) will not be part of the ISB and will be covered by the core solution. Accordingly the ISB should not be considered as representative of all integrations and/or APIs that will be part of the production system.

This swagger documents the set of apis for the Sandbox (ISB) solution.

Developers can also refer to section 2.3.10 of the Developer Portal User Manual for additional guidance and steps.

## Servers

| URL |
| :--- |
| `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal` |

## PATCH /production/csids

Renews an X509 Certificate (CSID) based on submitted CSR.

Renews an X509 Certificate (CSID) based on submitted CSR.

### Parameters

| Name | Type | Location | Description |
| :--- | :--- | :--- | :--- |
| **OTP*** | `string` | (header) | One time password generated from Fatoora portal |
| accept-language | `string` | (header) | Specifies the language in which the response will be returned. Currently supported languages are Eng |
| **Accept-Version*** | `string` | (header) | |

### Request Body Example

```json
{
  "csr": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0NCk1JSUNGekNDQWI0Q0FRQXdkVEVMTUFrR0ExVUVCaE1DVTBFeEZqQVVCZ05WQkFzTURWSnBlV0ZrYUNCQ2NtRnUNClkyZ3hKakFrQmdOVkJBb01IVTFoZUdsdGRXMGdVM0JsWldRZ1ZHVmphQ0JUZFhCd2JIa2dURlJFTVNZd0pBWUQNClZRUUREQjFVVTFRdE9EZzJORE14TVRRMUxUTTVPVGs1T1RrNU9Ua3dNREF3TXpCV01CQUdCeXFHU000OUFnRUcNCkJTdUJCQUFLQTBJQUJPVlQvWFVGcDVJdU0wWUZHSTZUUStBTGxWT0Z3RldxckNXMVU3M1NpUFJDSGM2Q1V4UXcNCmxoeG14aFRjNUdEOU1xRFM3YVArZi9OR0F3ZWJ6UmJvRjJpZ2dla3dnZVlHQ1NxR1NJYjNEUVFEdiBGQkVCUVFpQU1CQkFNQTBHQTFVZEl3UVZBaUV3SUVwS2VnMTBjbVZrYm1GbGJtUnlZVzV3ZEhNaUZqQVlCZ05WQkFzTURWTnVhWFY1SUdOdmJXNFRiMnhzSUdOdmJXNFRiMnhzSWdSdmJVZGtJaVJVZURna0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFCNEdBSVVBUUlCR2dGaGJCZ2NpQlFjREFnWUJpY0FnQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBRUJnd0ZnWElHQ1NxR000OUJnRUJCUVFpQUFCc0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBYWdBREJNQkFJSUt3WUJCQW9vTUFUQXdLd1lC... (Content continues for a while, I will truncate the example for brevity) **...**
}
```

### Responses

#### 200 OK
Returns a Base64 encoded X509 certificate.

| Property | Type | Description |
| :--- | :--- | :--- |
| `requestID` | `integer` | |
| `tokenType` | `string` | |
| `dispositionMessage` | `string` | |
| `binarySecurityToken` | `string` | |
| `secret` | `string` | |

```json
{
  "requestID": 347,
  "tokenType": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3",
  "dispositionMessage": "ISSUED",
  "binarySecurityToken": "TUlJRDRUQ0NBNGFnQXdJQkFnSVRGd0FBTzJVVXE4RmR0Z1lLNWdBQkFBQTdaVEFLQmdncWhrak9QUVFEQWpCaU1SVXdFd1lLQ1pJbWlaUHlMR1FCR1JZRmJHOWpZV3d4RXpBUkJnb0praWFKay9Jc1pBRVpGZ05uYjNZeEZ6QVZCZ29Ka2lhSmsvSXNaQUVaRmdkbGVIUm5ZWHAwTVJzd0dRWURWUVFERXhKUVVscEZTVTVXVDBsRFJWTkRRVEV0UTBFd0hoY05NalF3TVRFMU1UY3lOVEU1V2hjTk1qa3dNVEV6TVRjeU5URTVXakIxTVFzd0NRWURWUVFHRXdKVFFURW1NQ1FHQTFVRUNoTWRUV0Y0YVcxMWJTQlRjR1ZsWkNCVVpXTm9JRk4xY0hCc2VTQk1WRVF4RmpBVUJnTlZCQXNURFZKcGVXRmthQ0JDY21GdVkyZ3hKakFrQmdOVkJBTVRIVlJUVkMwNE9EWTBNekV4TkRVdE16azVPVGs1T1RrNU9UQXdNREF6TUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUU1VlA5ZFFXbmtpNHpSZ1VZanBORDRBdVZVNFhBVmFxc0piVlR2ZEtJOUVJZHpvSlRGRENXSEdiR0ZOemtZUDB5b05MdG8vNS84MFlEQjV2TkZ1Z1hhS09DQWdrd2dnSUZNSUd2QmdOVkhSRUVnYWN3Z2FTa2dhRXdnWjR4T3pBNUJnTlZCQVFNTWpFdFZGTlVmREl0VkZOVWZETXRaV1F5TW1ZeFpEZ3RaVFpoTWkweE1URTRMVGxpTlRndFpEbGhPR1l4TVdVME5EVm1NUjh3SFFZS0NaSW1pWlB5TEdRQkFRd1BNems1T1RrNU9UazVPVEF3TURBek1RMHdDd1lEVlFRTURBUXhNVEF3TVJFd0R3WURWUVFhREFoU1VsSkVNamt5T1RFY01Cb0dBMVVFRHd3VDJZMVRkWEJ3YkhrZ1lXTjBhWFpwZEdsbGN6QWRCZ05WSFE0RUZnUVVadkJOcHdmMFJzWTBvU2QyWXo2Tjg0aXhCRll3SHdZRFZSMGpCQmd3Rm9BVWNwUFJEbXY2SkZzVGhlckJGZk80RmZzYkJZMHdld1lJS3dZQkJRVUhBUUVFYnpCdE1Hc0dDQ3NHQVFVRkJ6QUNobDlvZEhSd09pOHZZV2xoTVM1NllYUmpZUzVuYjNZdWMyRXZRMlZ5ZEVWdWNtOXNiQzlRVWxwRmFXNTJiMmxqWlZORFFURXVaWGgwWjJGNmRDNW5iM1l1Ykc5allXeGZVRkphUlVsT1ZrOUpRMFZUUTBFeExVTkJLREVwTG1OeWREQU9CZ05WSFE4QkFmOEVCQU1DQjRBd1BBWUpLd1lCQkFHQ054VUhCQzh3TFFZbEt3WUJCQUdDTnhVSWdZYW9IWVRRK3hLRzdaMGtoODc3R2RQQVZXYUgrcVZsaGRtRVBnSUJaQUlCRWpBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREF3WUlLd1lCQlFVSEF3SXdKd1lKS3dZQkJBR0NOeFVLQkJvd0dEQUtCZ2dyQmdFRkJRY0RBekFLQmdnckJnRUZCUWNEQWpBS0JnZ3Foa2pPUFFRREFnTkpBREJHQWlFQS9vaDRIb2FlTGh6SDFNN2YrTjBrSmZoSW42RHlzQkZaWEZNcGdnK3poeG9DSVFDVWwweEtyTGxuZEM5V25QdGVSNUx1dVF2amdQQUpvUklFd2JDeVJpSXk2dw0K",
  "secret": "1npmzeTq4VnKFQaZ5/9SwUxNhoLtuMWZVLVWUm3MTVU="
}
```

#### 400 Bad Request
HTTP Bad Request. Returned when the submitted request is invalid.

```json
{
  "errors": [
    {
      "code": "Missing-OTP",
      "message": "OTP is required field"
    }
  ]
}
```

#### 401 Unauthorized
Returned when username and password are not added or added as wrong values.

```json
{
  "timestamp": 1654514661409,
  "status": 401,
  "error": "Unauthorized",
  "message": ""
}
```

#### 406 Not Acceptable
Returned when accept version header is anything other than V2.

```
This Version is not supported or not provided in the header.
```

#### 428 Precondition Required
Returns a Base64 encoded X509 compliance certificate.

*Note: The structure provided in the documentation for 428 seems to imply a successful process that returns certificate data, similar to a successful 200 response but perhaps indicating a precondition (like compliance) was required/checked.*

```json
{
  "value": {
    "requestID": 1234567890123,
    "tokenType": null,
    "dispositionMessage": "NOT_COMPLIANT",
    "binarySecurityToken": "TUlJQ1FEQ0NBZVdnQXdJQkFnSUdBWTBPTFNiWk1Bb0dDQ3FHU000OUJBTUNNQlV4RXpBUkJnTlZCQU1NQ21WSmJuWnZhV05wYm1jd0hoY05NalF3TVRFMU1UY3pNRFV4V2hjTk1qa3dNVEUwTWpFd01EQXdXakIxTVFzd0NRWURWUVFHRXdKVFFURVdNQlFHQTFVRUN3d05VbWw1WVdSb0lFSnlZVzVqYURFbU1DUUdBMVVFQ2d3ZFRXRjRhVzExYlNCVGNHVmxaQ0JVWldOb0lGTjFjSEJzZVNCTVZFUXhKakFrQmdOVkJBTU1IVlJUVkMwNE9EWTBNekV4TkRVdE16azVPVGs1T1RrNU9UQXdNREF6TUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUU1VlA5ZFFXbmtpNHpSZ1VZanBORDRBdVZVNFhBVmFxc0piVlR2ZEtJOUVJZHpvSlRGRENXSEdiR0ZOemtZUDB5b05MdG8vNS84MFlEQjV2TkZ1Z1hhS09Cd3pDQndEQU1CZ05WSFJNQkFmOEVBakFBTUlHdkJnTlZIUkVFZ2Fjd2dhU2tnYUV3Z1o0eE96QTVCZ05WQkFRTU1qRXRWRk5VZkRJdFZGTlVmRE10WldReU1tWXhaRGd0WlRaaE1pMHhNVEU0TFRsaU5UZ3RaRGxoT0dZeE1XVTBORFZtTVI4d0hRWUtDWkltaVpQeUxHUUJBUXdQTXprNU9UazVPVGs1T1RBd01EQXpNUTB3Q3dZRFZRUU1EQVF4TVRBd01SRXdEd1lEVlFRYURBaFNVbEpFTWpreU9URWNNQm9HQTFVRUR3d1QyWTFUZFhCd2JIa2dZV04wYVhacGRHbGxjekFLQmdncWhrak9QUVFEQWdOSkFEQkdBaUVBM1JsTTJlaGZaMzFmdk5yRGlJKzI5c0crNGJVVlg2QWZ1eEJuNUJiLzZ4TUNJUUQ5ZmxVNTc4U0htdEdZeTNWaW9LSU1VMFpMVHJaT2liOXdHVTliTFJiYll3PT0=",
    "secret": "goDgeIdM5mkfTThl1unu8rP9XhknKWAc24hafXZS1f4=",
    "errors": null
  }
}
```

#### 500 Internal Server Error
HTTP Internal Server Error. Returned when the service faces internal errors.

```json
{
  "category": "HTTP-Errors",
  "code": "500",
  "message": "Something went wrong and caused an Internal Server Error."
}
```

---

## Schemas

### InfoModel

An object representing the result of the clearance or reporting API endpoints when the clearance flag is turned on or off. Basically, it shows an informational message instructing the client to see the other API.

| Property | Type | Description |
| :--- | :--- | :--- |
| `message` | `string` | |

### ErrorModel

An object representing the structure of the error object returned by the API endpoints. Specifically, it includes the Category of the error, its code and message.

| Property | Type | Description |
| :--- | :--- | :--- |
| `category` | `string` | |
| `code` | `string` | |
| `message` | `string` | |

### WarningModel

An object representing the structure of the warning object returned by the API endpoints. Specifically, it includes the Category of the warning, its code and message.

| Property | Type | Description |
| :--- | :--- | :--- |
| `category` | `string` | |
| `code` | `string` | |
| `message` | `string` | |

### InvoiceResultModel

An Object that represents the response of the API endpoint where it shows the results including status, warnings (if any), and errors (if any) in addition to the submitted document hash.

| Property | Type | Description |
| :--- | :--- | :--- |
| `invoiceHash` | `string` | |
| `status` | `string` (enum) | |
| `warnings` | `array` [WarningModel] | |
| `erros` | `array` [ErrorModel] | |

### ClearedInvoiceResultModel

An object representing the structure of the clearance endpoint response. Specifically, it is an object that contains the hash of the document, status, the cleared document, warnings (if any), and errors (if any).

| Property | Type | Description |
| :--- | :--- | :--- |
| `invoiceHash` | `string` | |
| `clearedInvoice` | `string` | |
| `status` | `string` (enum) | |
| `warnings` | `array` [WarningModel] | |
| `erros` | `array` [ErrorModel] | |

### InvoiceRequest

An object representing the structure of the clearance endpoint request. Specifically, it has the submitted document hash and the base64 representation of the invoice.

| Property | Type | Description |
| :--- | :--- | :--- |
| `invoiceHash` | `string` | |
| `invoice` | `string` | |

### CSRRequest

An object representing the structure of the CSR request that is used to generate a CSID.

| Property | Type | Description |
| :--- | :--- | :--- |
| `csr` | `string` | |

### CertificatesErrorsResponse

| Property | Type | Description |
| :--- | :--- | :--- |
| `errors` | `array` [ErrorModel] | |