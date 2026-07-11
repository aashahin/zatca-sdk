# e-Invoicing Sandbox Release (2.1.0) 1.0.0 OAS3

**Version**: 1.0.0

ZATCA wants to provide Taxpayers and Developers of Taxpayer e-invoicing solutions and devices the opportunity to test the integration of the systems with a ZATCA Sandbox environment prior to the launch of the production system. The Integration Sandbox (ISB) should enable solution developers to simulate the integration calls/requests that will be required later as part of the registration process and the submission of e-invoices, credit and debit notes to the production system. The Sandbox backend will accordingly simulate the validations and responses as part of the Cryptographic Stamp Identifiers issuance, renewal and revocation as well as the Reporting and Clearance function.

Although the ISB will give ZATCA an indication of the adoption rate for e-invoicing solutions in the market, it will not be mandatory to complete Sandbox testing as a pre-requisite for Registration/Taxpayer onboarding or accessing the production system. Similar to the Compliance and Enablement Toolbox (CET), the ISB is also aimed at Developers to build/update their solutions which are in line with ZATCA specifications and standards and are able to integrate with a ZATCA backend. Accordingly access to the ISB test/mock APIs will not be limited to Taxpayers and any user can register for a Developer account to access the ISB test/mock APIs and associated documentation. This registration will enable ZATCA to monitor the solution providers who intent to develop/update their solutions to integrate with ZATCA.

It should be noted that although the ISB will simulate most of the core functionalities of the production system, any validations that require integrations/access with external systems and/or storage as well as scenarios involving any backend exceptional handling (for example overriding the clearance process) will not be part of the ISB and will be covered by the core solution. Accordingly the ISB should not be considered as representative of all integrations and/or APIs that will be part of the production system.

This swagger documents the set of apis for the Sandbox (ISB) solution.

Developers can also refer to section 2.3.10 of the Developer Portal User Manual for additional guidance and steps.

## Servers

- `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal`

## POST /compliance

Issues an X509 Compliance Cryptographic Stamp Identifier (CCSID/Certificate) (CSID) based on submitted CSR.

This is a compliance CSID (CCSID) that is issued by the einvoicing system as it is a prerequisite to complete the compliance steps. The CCSID is sent in the authentication certificate header in the compliance api calls.

The CSR specification required to perform the Compliance API call is covered in section 4.3 of the Developer Portal user manual.

### Parameters

| Name | Type | Location | Description |
| :--- | :--- | :--- | :--- |
| OTP * | integer | (header) | |
| Accept-Version * | string | (header) | |

### Request Body Example

```json
{
  "csr": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJQ0ZUQ0NBYndDQVFBd2RURUxNQWtHQTFVRUJoTUNVMEV4RmpBVUJnTlZCQXNNRFZKcGVXRmthQ0JDY21GdQpZMmd4SmpBa0JnTlZCQW9NSFUxaGVHbHRkVzBnVTNCbFpXUWdWR1ZqYUNCVGRYQndiSGtnVEZSRU1TWXdKQVlEClZRUUREQjFVVTFRdE9EZzJORE14TVRRMUxUTTVPVGs1T1RrNU9Ua3dNREF3TXpCV01CQUdCeXFHU000OUFnRUcKQlN1QkJBQUtBMElBQktGZ2ltdEVtdlJTQkswenI5TGdKQXRWU0NsOFZQWno2Y2RyNVgrTW9USG84dkhOTmx5Vwo1UTZ1N1Q4bmFQSnF0R29UakpqYVBJTUo0dTE3ZFNrL1ZIaWdnZWN3Z2VRR0NTcUdTSWIzRFFFSkRqR0IxakNCCjB6QWhCZ2tyQmdFRUFZSTNGQUlFRkF3U1drRlVRMEV0UTI5a1pTMVRhV2R1YVc1bk1JR3RCZ05WSFJFRWdhVXcKZ2FLa2daOHdnWnd4T3pBNUJnTlZCQVFNTWpFdFZGTlVmREl0VkZOVWZETXRaV1F5TW1ZeFpEZ3RaVFpoTWkweApNVEU0TFRsaU5UZ3RaRGxoT0dZeE1XVTBORFZtTVI4d0hRWUtDWkltaVpQeUxHUUJBUXdQTXprNU9UazVPVGs1Ck9UQXdNREF6TVEwd0N3WURWUVFNREFReE1UQXdNUkV3RHdZRFZRUWFEQWhTVWxKRU1qa3lPVEVhTUJnR0ExVUUKRHd3UlUzVndjR3g1SUdGamRHbDJhWFJwWlhNd0NnWUlLb1pJemowRUF3SURSd0F3UkFJZ1NHVDBxQkJ6TFJHOApJS09melI1L085S0VicHA4bWc3V2VqUlllZkNZN3VRQ0lGWjB0U216MzAybmYvdGo0V2FxbVYwN01qZVVkVnVvClJJckpLYkxtUWZTNwotLS0tLUVORCBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0K"
}
```

### Responses

#### 200 (Successful response)

```json
{
  "requestID": 1234567890123,
  "dispositionMessage": "ISSUED",
  "binarySecurityToken": "TUlJQ1BUQ0NBZU9nQXdJQkFnSUdBWXp6Z0VoTk1Bb0dDQ3FHU000OUJBTUNNQlV4RXpBUkJnTlZCQU1NQ21WSmJuWnZhV05wYm1jd0hoY05NalF3TVRFd01UTXhNVFUwV2hjTk1qa3dNVEE1TWpFd01EQXdXakIxTVFzd0NRWURWUVFHRXdKVFFURVdNQlFHQTFVRUN3d05VbWw1WVdSb0lFSnlZVzVqYURFbU1DUUdBMVVFQ2d3ZFRXRjRhVzExYlNCVGNHVmxaQ0JVWldOb0lGTjFjSEJzZVNCTVZFUXhKakFrQmdOVkJBTU1IVlJUVkMwNE9EWTBNekV4TkRVdE16azVPVGs1T1RrNU9UQXdNREF6TUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVvV0NLYTBTYTlGSUVyVE92MHVBa0MxVklLWHhVOW5QcHgydmxmNHloTWVqeThjMDJYSmJsRHE3dFB5ZG84bXEwYWhPTW1Obzhnd25pN1h0MUtUOVVlS09Cd1RDQnZqQU1CZ05WSFJNQkFmOEVBakFBTUlHdEJnTlZIUkVFZ2FVd2dhS2tnWjh3Z1p3eE96QTVCZ05WQkFRTU1qRXRWRk5VZkRJdFZGTlVmRE10WldReU1tWXhaRGd0WlRaaE1pMHhNVEU0TFRsaU5UZ3RaRGxoT0dZeE1XVTBORFZtTVI4d0hRWUtDWkltaVpQeUxHUUJBUXdQTXprNU9UazVPVGs1T1RBd01EQXpNUTB3Q3dZRFZRUU1EQVF4TVRBd01SRXdEd1lEVlFRYURBaFNVbEpFTWpreU9URWFNQmdHQTFVRUR3d1JVM1Z3Y0d4NUlHRmpkR2wyYVhScFpYTXdDZ1lJS29aSXpqMEVBd0lEU0FBd1JRSWhBSUY4akljeHp2Q3lxVURUcDVPbXY3MlVweFBBTG1vUnl0OURZMjRqV21CUUFpQTBiYVo2WXJwcDV5SjRhaG9vb1czK09hOGtrYjMxZXZBb0hkdmdEODA2M3c9PQ==",
  "secret": "Dehvg1fc8GF6Jwt5bOxXwC6enR93VxeNEo2mlUatfgw="
}
```

#### 400 (HTTP Bad Request)
Returned when the submitted request is invalid.

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

#### 406

```json
This Version is not supported or not provided in the header.
```

#### 500 (HTTP Internal Server Error)
Returned when the service faces internal errors.

```json
{
  "code": "Invalid-Request",
  "message": "System failed to process your request"
}
```

## Schemas

### InfoModel

An object representing the result of the clearance or reporting API endpoints when the clearance flag is turned on or off. Basically, it shows an informational message instructing the client to see the other api.

| Property | Type |
| :--- | :--- |
| message | string |

### ErrorModel

An object representing the structure of the error object returned by the API endpoints. Specifically, it includes the Category of the error, its code and message.

| Property | Type |
| :--- | :--- |
| category | string |
| code | string |
| message | string |

### WarningModel

An object representing the structure of the warning object returned by the API endpoints. Specifically, it includes the Category of the warning, its code and message.

| Property | Type |
| :--- | :--- |
| category | string |
| code | string |
| message | string |

### InvoiceResultModel

An Object the represents the response of the API endpoint where it shows the results including status, warnings (if any), and error (if any) in addition to the submitted document hash

| Property | Type |
| :--- | :--- |
| invoiceHash | string |
| status | string (enum) |
| warnings | WarningModel[] |
| erros | ErrorModel[] |

### ClearedInvoiceResultModel

An object representing the structure of the clearance endpoint response. Specifically, it is an object that contains the hash of the document, status, the cleared document, warnings (if any), and errors (if any).

| Property | Type |
| :--- | :--- |
| invoiceHash | string |
| clearedInvoice | string |
| status | string (enum) |
| warnings | WarningModel[] |
| erros | ErrorModel[] |

### InvoiceRequest

An object representing the structure of the clearance endpoint request. Specifically, it has the submitted document hash and the base64 representation of the invoice.

| Property | Type |
| :--- | :--- |
| invoiceHash | string |
| invoice | string |

### CSRRequest

An object representing the structure of the CSR request that is used to generate a CSID.

| Property | Type |
| :--- | :--- |
| csr | string |

### CertificatesErrorsResponse

| Property | Type |
| :--- | :--- |
| errors | ErrorModel[] |