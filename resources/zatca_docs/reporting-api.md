# e-Invoicing Sandbox Release (2.1.0) 1.0.0 OAS3

**Version:** 1.0.0

ZATCA wants to provide Taxpayers and Developers of Taxpayer e-invoicing solutions and devices the opportunity to test the integration of the systems with a ZATCA Sandbox environment prior to the launch of the production system. The Integration Sandbox (ISB) should enable solution developers to simulate the integration calls/requests that will be required later as part of the registration process and the submission of e-invoices, credit and debit notes to the production system. The Sandbox backend will accordingly simulate the validations and responses as part of the Cryptographic Stamp Identifiers issuance, renewal and revocation as well as the Reporting and Clearance function.

Although the ISB will give ZATCA an indication of the adoption rate for e-invoicing solutions in the market, it will not be mandatory to complete Sandbox testing as a pre-requisite for Registration/Taxpayer onboarding or accessing the production system. Similar to the Compliance and Enablement Toolbox (CET), the ISB is also aimed at Developers to build/update their solutions which are in line with ZATCA specifications and standards and are able to integrate with a ZATCA backend. Accordingly access to the ISB test/mock APIs will not be limited to Taxpayers and any user can register for a Developer account to access the ISB test/mock APIs and associated documentation. This registration will enable ZATCA to monitor the solution providers who intent to develop/update their solutions to integrate with ZATCA.

It should be noted that although the ISB will simulate most of the core functionalities of the production system, any validations that require integrations/access with external systems and/or storage as well as scenarios involving any backend exceptional handling (for example overriding the clearance process) will not be part of the ISB and will be covered by the core solution. Accordingly the ISB should not be considered as representative of all integrations and/or APIs that will be part of the production system.

Kindly note that validations which can result in an UBL XSD error also apply to optional fields if the tag is present and data input is not compliant. This includes leaving such fields blank. However if the tag itself is absent than the validations will not be performed.

This swagger documents the set of apis for the Sandbox (ISB) solution.

Developers can also refer to section 2.3.10 of the Developer Portal User Manual for additional guidance and steps.

## Servers

- `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal`

## POST /invoices/reporting/single

Reports a single invoice.

Reports a single SIMPLIFIED invoice, credit note, or debit note. Specifically, it accepts simplified invoice, credit note, or debit note encoded in base64 and validates it to ensure:

1. Compliance to the UBL2 XSD.
2. EN 16931 Rules set.
3. KSA Specific Rules set.
    > KSA Rules set will override EN 16931 Rules set in case the same rule exists in both sets.
4. QR Code validation
5. Cryptographical Stamp validation
6. Previous Invoice Hash Validation (PIH)

### Parameters (Headers)

| Name | Type | Location | Description |
| :--- | :--- | :--- | :--- |
| Authorization | string | header | Username (Production Certificate) and Password (Secret) should be taken from the Production certificate |
| accept-language | string | header | Specifies the language in which the response will be returned. Currently supported languages are Eng |
| Clearance-Status * | string | header | Specifies the clearance status, while "0" when clearance is disabled and "1" when clearance is enabled |
| Accept-Version * | string | header | |

### Request Body Example

```json
{
  "invoiceHash": "vLGQoYNoM3tf1XAxKpoNTSz/8pkdidXy47HWh0VQmu8=",
  "uuid": "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
  "invoice": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPEludm9pY2UgeG1sbnM9InVybjpvYXNpczpuYW1lczpzcGVjaWZpY2F0aW9uOnVibDpzY2hlbWE6eHNkOkludm9pY2UtMiIgeG1sbnM6Y2FjPSJ1cm46b2FzaXM6bmFtZXM6c3BlY2lmaWNhdGlvbjp1Ymw6c2NoZW1hOnhzZDpDb21tb25BZ2dyZWdhdGVDb21wb25lbnRzLTIiIHhtbG5zOmNiYz0idXJuOm9hc2lzOm5hbWVzOnNwZWNpZmljYXRpb246dWJsOnNjaGVtYTp4c2Q6Q29tbW9uQmFzaWNDb21wb25lbnRzLTIiIHhtbG5zOmV4dD0idXJuOm9hc2lzOm5hbWVzOnNwZWNpZmljYXRpb246dWJsOnNjaGVtYTp4c2Q6Q29tbW9uRXh0ZW5zaW9uQ29tcG9uZW50cy0yIj48ZXh0OlVCTEV4dGVuc2lvbnM+CiAgICA8ZXh0OlVCTEV4dGVuc2lvbj4KICAgICAgICA8ZXh0OkV4dGVuc2lvblVSST51cm46b2FzaXM6bmFtZXM6c3BlY2lmaWNhdGlvbjp1Ymw6ZHNpZzplbnZlbG9wZWQ6eGFkZXM8L2V4dDpFeHRlbnNpb25VUkk+CiAgICAgICAgPGV4dDpFeHRlbnNpb25Db250ZW50PgogICAgICAgICAgICA8c2lnOlVCTERvY3VtZW50U2lnbmF0dXJlcyB4bWxuczpzaWc9InVybjpvYXNpczpuYW1lczpzcGVjaWZpY2F0aW9uOnVibDpzY2hlbWE6eHNkOkNvbW1vblNpZ25hdHVyZUNvbXBvbmVudHMtMiIgeG1sbnM6c2FjPSJ1cm46b2FzaXM6bmFtZXM6c3BlY2lmaWNhdGlvbjp1Ymw6c2NoZW1hOnhzZDpTaWduYXR1cmVBZ2dyZWdhdGVDb21wb25lbnRzLTIiIHhtbG5zOnNiYz0idXJuOm9hc2lzOm5hbWVzOnNwZWNpZmljYXRpb246dWJsOnNjaGVtYTpTaWduYXR1cmVCYXNpY0NvbXBvbmVudHMtMiI+CiAgICAgICAgICAgICAgICA8c2FjOlNpZ25hdHVyZUluZm9ybWF0aW9uPiAKICAgICAgICAgICAgICAgICAgICA8Y2JjOklEPnVybjpvYXNpczpuYW1lczpzcGVjaWZpY2F0aW9uOnVibDpzZXZpZ25hdHVyZToxPC9jYmM6SUQ+CiAgICAgICAgICAgICAgICAgICAgPHNiYzpSZWZlcmVuY2VkU2lnbmF0dXJlSUQ+dXJuOm9hc2lzOm5hbWVzOnNwZWNpZmljYXRpb246dWJsOnNpZ25hdHVyZTpJbnZvaWNlPC9zYmM6UmVmZXJlbmNlZFNpZ25hdHVyZUlEPgogICAgICAgICAgICAgICAgICAgIDxkczpTaWduYXR1cmUgeG1sbnM6ZHM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyMiIElkPSJzaWduYXR1cmUiPgogICAgICAgICAgICAgICAgICAgICAgICA8ZHM6U2lnbmVkSW5mbz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkczpDYW5vbmljYWxpemF0aW9uTWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwNi8xMi94bWwtYzE0bjExIi8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6U2lnbmF0dXJlTWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxkc2lnLW1vcmUjZWNkc2Etc2hhMjU2Ii8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6UmVmZXJlbmNlIElkPSJpbnZvaWNlU2lnbmVkRGF0YSIgVVJJPSIiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkczpUcmFuc2Zvcm1zPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6VHJhbnNmb3JtIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvVFIvMTk5OS9SRUMteHBhdGgtMTk5OTEHMTYiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOlhQYXRoPm5vdCgvL2FuY2VzdG9yLW9yLXNlbGY6OmV4dDpVQkxFeHRlbnNpb25zKTwvZHM6WFBhdGg+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZHM6VHJhbnNmb3JtPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6VHJhbnNmb3JtIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvVFIvMTk5OS9SRUMteHBhdGgtMTk5OTEHMTYiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOlhQYXRoPm5vdCgvL2FuY2VzdG9yLW9yLXNlbGY6OmNhYzpTaWduYXR1cmUpPC9kczpYUGF0aD4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kczpUcmFuc2Zvcm0+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkczpUcmFuc2Zvcm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy9UUi8xOTk5L1JFQy14cGF0aC0xOTk5MTExNiI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6WFBhdGg+bm90KC8vYW5jZXN0b3Itb3Itc2VsZjo6Y2FjOkFkZGl0aW9uYWxEb2N1bWVudFJlZmVyZW5jZVtLYmM6SUQ9J1FSJ10pPC9kczpYUGF0aD4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kczpUcmFuc2Zvcm0+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkczpUcmFuc2Zvcm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDA2LzEyL3htbC1jMTRuMTEiLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2RzOlRyYW5zZm9ybXM+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOkRpZ2VzdE1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZW5jI3NoYTI1NiIvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOkRpZ2VzdFZhbHVlPnZMR1FvWU5vTTN0ZjFYQXhLcG9OVFN6Lzhwa2RpZFh5NDdIV2gwVlFtdTg9PC9kczpEaWdlc3RWYWx1ZT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZHM6UmVmZXJlbmNlPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOlJlZmVyZW5jZSBUeXBlPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjU2lnbmF0dXJlUHJvcGVydGllcyIgVVJJPSIjeGFkZXNTaWduZWRQcm9wZXJ0aWVzIj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6RGlnZXN0TWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjc2hhMjU2Ii8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOkRpZ2VzdFZhbHVlPlltRTFaRFV3TXpBd1pEVm1PREpsTUdGaFpETTRNamxrT0RJd1kySmtNV0psTWpneE16ZGhZbVZqT1RFNE5qQmlOV0ppT0RRM09XRTVZekJrWVRjd1pBPT08L2RzOkRpZ2VzdFZhbHVlPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kczpSZWZlcmVuY2U+CiAgICAgICAgICAgICAgICAgICAgICAgIDwvZHM6U2lnbmVkSW5mbz4KICAgICAgICAgICAgICAgICAgICAgICAgPGRzOlNpZ25hdHVyZVZhbHVlPk1FUUNJRmlSZjliYW5mZVpYRWY4Q1k0TVRmMW1SY1FsbXpBMVpodDBBazVHdXkxbUFpQm9MWGlkNjFLQUVOb0dod3YyZmh5S3IzNTBNMG1XWGlOUk5MQUc5ZWFFVUE9PTwvZHM6U2lnbmF0dXJlVmFsdWU+CiAgICAgICAgICAgICAgICAgICAgICAgIDxkczpLZXlJbmZvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOlg1MDlEYXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkczpYNTA5Q2VydGlmaWNhdGU+TUlJRDNqQ0NBNFNnQXdJQkFnSVRFUUFBT0FQRjkwQWpzL3hjWHdBQkFBQTRBekFLQmdncWhrak9QUVFEQWpCaU1SVXdFd1lLQ1pJbWlaUHlMR1FCR1JZRmJHOWpZV3d4RXpBUkJnb0praWFKay9Jc1pBRVpGZ05uYjNZeEZ6QVZCZ29Ka2lhSmsvSXNaQUVaRmdkbGVIUm5ZWHAwTVJzd0dRWURWUVFERXhKUVVscEZTVTVXVDBsRFJWTkRRVFF0UTBFd0hoY05NalF3TVRFeE1Ea3hPVE13V2hjTk1qa3dNVEE1TURreE9UTXdXakIxTVFzd0NRWURWUVFHRXdKVFFURW1NQ1FHQTFVRUNoTWRUV0Y0YVcxMWJTQlRjR1ZsWkNCVVpXTm9JRk4xY0hCc2VTQk1WRVF4RmpBVUJnTlZCQXNURFZKcGVXRmthQ0JDY21GdVkyZ3hKakFrQmdOVkJBTVRIVlJUVkMwNE9EWTBNekV4TkRVdE16azVPVGs1T1RrNU9UQXdNREF6TUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVvV0NLYTBTYTlGSUVyVE92MHVBa0MxVklLWHhVOW5QcHgydmxmNHloTWVqeThjMDJYSmJsRHE3dFB5ZG84bXEwYWhPTW1Obzhnd25pN1h0MUtUOVVlS09DQWdjd2dnSURNSUd0QmdOVkhSRUVnYVV3Z2FLa2daOHdnWnd4T3pBNUJnTlZCQVFNTWpFdFZGTlVmREl0VkZOVWZETXRaV1F5TW1ZeFpEZ3RaVFpoTWkweE1URTRMVGxpTlRndFpEbGhPR1l4TVdVME5EVm1NUjh3SFFZS0NaSW1pWlB5TEdRQkFRd1BNems1T1RrNU9UazVPVEF3TURBek1RMHdDd1lEVlFRTURBUXhNVEF3TVJFd0R3WURWUVFhREFoU1VsSkVNamt5T1RFYU1CZ0dBMVVFRHd3UlUzVndjR3g1SUdGamRHbDJhWFJwWlhNd0hRWURWUjBPQkJZRUZFWCtZdm1tdG5Zb0RmOUJHYktvN29jVEtZSzFNQjhHQTFVZEl3UVlNQmFBRkp2S3FxTHRtcXdza0lGelZ2cFAyUHhUKzlObk1Ic0dDQ3NHQVFVRkJ3RUJCRzh3YlRCckJnZ3JCZ0VGQlFjd0FvWmZhSFIwY0RvdkwyRnBZVFF1ZW1GMFkyRXVaMjkyTG5OaEwwTmxjblJGYm5KdmJHd3ZVRkphUlVsdWRtOXBZMlZUUTBFMExtVjRkR2RoZW5RdVoyOTJMbXh2WTJGc1gxQlNXa1ZKVGxaUFNVTkZVME5CTkMxRFFTZ3hLUzVqY25Rd0RnWURWUjBQQVFIL0JBUURBZ2VBTUR3R0NTc0dBUVFCZ2pjVkJ3UXZNQzBHSlNzR0FRUUJnamNWQ0lHR3FCMkUwUHNTaHUyZEpJZk8reG5Ud0ZWbWgvcWxaWVhaaEQ0Q0FXUUNBUkl3SFFZRFZSMGxCQll3RkFZSUt3WUJCUVVIQXdNR0NDc0dBUVVGQndNQ01DY0dDU3NHQVFRQmdqY1ZDZ1FhTUJnd0NnWUlLd1lCQlFVSEF3TXdDZ1lJS3dZQkJRVUhBd0l3Q2dZSUtvWkl6ajBFQXdJRFNBQXdSUUloQUxFL2ljaG1uV1hDVUtVYmNhM3ljaThvcXdhTHZGZEhWalFydmVJOXVxQWJBaUE5aEM0TThqZ01CQURQU3ptZDJ1aVBKQTZnS1IzTEUwM1U3NWVxYkMvclhBPT08L2RzOlg1MDlDZXJ0aWZpY2F0ZT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZHM6WDUwOURhdGE+CiAgICAgICAgICAgICAgICAgICAgICAgIDwvZHM6S2V5SW5mbz4KICAgICAgICAgICAgICAgICAgICAgICAgPGRzOk9iamVjdD4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx4YWRlczpRdWFsaWZ5aW5nUHJvcGVydGllcyB4bWxuczp4YWRlcz0iaHR0cDovL3VyaS5ldHNpLm9yZy8wMTkwMy92MS4zLjIjIiBUYXJnZXQ9InNpZ25hdHVyZSI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHhhZGVzOlNpZ25lZFByb3BlcnRpZXMgSWQ9InhhZGVzU2lnbmVkUHJvcGVydGllcyI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx4YWRlczpTaWduZWRTaWduYXR1cmVQcm9wZXJ0aWVzPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHhhZGVzOlNpZ25pbmdUaW1lPjIwMjUtMDYtMDJUMTU6NDQ6MDE8L3hhZGVzOlNpZ25pbmdUaW1lPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHhhZGVzOlNpZ25pbmdDZXJ0aWZpY2F0ZT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8eGFkZXM6Q2VydD4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHhhZGVzOkNlcnREaWdlc3Q+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6RGlnZXN0TWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjc2hhMjU2Ii8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZHM6RGlnZXN0VmFsdWU+WkRNd01tSTBNVEUxTnpWak9UVTJOVGs0WXpWbE9EaGhZbUkwT0RVMk5EVXlOVFUyWVRWaFlqaGhNREZtTjJGallqazFZVEEyT1dRME5qWTJNalE0TlE9PTwvZHM6RGlnZXN0VmFsdWU+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwveGFkZXM6Q2VydERpZ2VzdD4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHhhZGVzOklzc3VlclNlcmlhbD4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkczpYNTA5SXNzdWVyTmFtZT5DTj1QUlpFSU5WT0lDRVNDQTQtQ0EsIERDPWV4dGdhenQsIERDPWdvdiwgREM9bG9jYWw8L2RzOlg1MDlJc3N1ZXJOYW1lPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRzOlg1MDlTZXJpYWxOdW1iZXI+Mzc5MTEyNzQyODMxMzgwNDcxODM1MjYzOTY5NTg3Mjg3NjYzNTIwNTI4Mzg3PC9kczpYNTA5U2VyaWFsTnVtYmVyPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3hhZGVzOklzc3VlclNlcmlhbD4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3hhZGVzOkNlcnQ+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3hhZGVzOlNpZ25pbmdDZXJ0aWZpY2F0ZT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3hhZGVzOlNpZ25lZFByb3BlcnRpZXM+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3hhZGVzOlF1YWxpZnlpbmdQcm9wZXJ0aWVzPgogICAgICAgICAgICAgICAgICAgICAgICA8L2RzOk9iamVjdD4KICAgICAgICAgICAgICAgICAgICA8L2RzOlNpZ25hdHVyZT4KICAgICAgICAgICAgPC9zYWM6U2lnbmF0dXJlSW5mb3JtYXRpb24+CiAgICAgICAgICAgIDwvc2lnOlVCTERvY3VtZW50U2lnbmF0dXJlcz4KICAgICAgICA8L2V4dDpFeHRlbnNpb25Db250ZW50PgogICAgPC9leHQ6VUJMRXh0ZW5zaW9uPgoKICAgIDxjYmM6UHJvZmlsZUlEPnJlcG9ydGluZzoxLjA8L2NiYzpQcm9maWxlSUQ+CiAgICA8Y2JjOklEPlNNRTAwMDEwPC9jYmM6SUQ+CiAgICA8Y2JjOlVVSUQ+OGU2MDAwY2YtMWE5OC00MTc0LWIzZTctYjVkNTk1NGJjMTBkPC9jYmM6VVVJRD4KICAgIDxjYmM6SXNzdWVEYXRlPjIwMjUtMDYtMDI8L2NiYzpJc3N1ZURhdGU+CiAgICA8Y2JjOklzc3VlVGltZT4xNzo0MTowODwvY2JjOklzc3VlVGltZT4KICAgIDxjYmM6SW52b2ljZVR5cGVQ29kZSBv21lPSIwMjAwMDAwIj4zODg8L2NiYzpJbnZvaWNlVHlwZUNvZGU+CiAgICA8Y2JjOk5vdGUgbGFuZ3VhZ2VJRz0iYXIiPkFCQzwvY2JjOk5vdGU+CiAgICA8Y2JjOkRvY3VtZW50Q3VycmVuY3lDb2RlPlNBUjwvY2JjOkRvY3VtZW50Q3VycmVuY3lDb2RlPgogICAgPGNiYzpUYXhDdXJyZW5jeUNvZGU+U0FSPC9jYmM6VGF4Q3VycmVuY3lDb2RlPgogICAgPGNhYzpBZGRpdGlvbmFsRG9jdW1lbnRSZWZlcmVuY2U+CiAgICAgICAgPGNiYzpJRD5JQ1Y8L2NiYzpJRD4KICAgICAgICA8Y2JjOlVVSUQ+MTA8L2NiYzpVVUlEPgogICAgPC9jYWM6QWRkaXRpb25hbERvY3VtZW50UmVmZXJlbmNlPgogICAgPGNhYzpBZGRpdGlvbmFsRG9jdW1lbnRSZWZlcmVuY2U+CiAgICAgICAgPGNiYzpJRD5QSUg8L2NiYzpJRD4KICAgICAgICA8Y2FjOkF0dGFjaG1lbnQ+CiAgICAgICAgICAgIDxjYmM6RW1iZWRkZWREb2N1bWVudEJpbmFyeU9iamVjdCBtaW1lQ29kZT0idGV4dC9wbGFpbiI+TlhaanlVd2lOWm1abm00Tm1Zek9HUTVOVEkzT0Raak5tUTJPVFpqTnpsak1tUmlZekl6T1dSa05HVTVNV0kwTmpjeU9XUTNNMkV5TjJaaU5UZGxPUT09PC9jYmM6RW1iZWRkZWREb2N1bWVudEJpbmFyeU9iamVjdD4KICAgICAgICA8L2NhYzpBdHRhY2htZW50PgogICAgPC9jYWM6QWRkaXRpb25hbERvY3VtZW50UmVmZXJlbmNlPgogICAgCiAgICAKICAgIDxjYWM6QWRkaXRpb25hbERvY3VtZW50UmVmZXJlbmNlPgogICAgICAgIDxjYmM6SUQ+UVI8L2NiYzpJRD4KICAgICAgICA8Y2FjOkF0dGFjaG1lbnQ+CiAgICAgICAgICAgIDxjYmM6RW1iZWRkZWREb2N1bWVudEJpbmFyeU9iamVjdCBtaW1lQ29kZT0idGV4dC9wbGFpbiI+QVcvWXROaXgyWVBZcVNOWXF0bWkyTFhaaXRpdklOaW4yWVRZcXRtRDJZYlppTm1FMllqWXJObUsyS2NnMktqWW85bUMyTFhaaVNOWXM5aXgyTG5ZcVNOWXA5bUUyWVhZcmRpdjJZallyOWlwSUh3Z1RXRjRhVzExYlNCVGNHVmxaQ0JVWldOb0lGTjFjSEJzZVNCTVZFUUNEek01T1RrNU9UazVPVGt3TURBd013TVRNakF5TlMwd05pMHdNbFF4TnpvME1Ub3dPQVFHTWpNeExqRTFCUVV6TUM0eE5RWXNka3hIVVc5WlRtOU5NM1JtTVZoQmVFdHdiMDVVVTNvdk9IQnJaR2xrV0hrME4waFhhREJXVVcxMU9EMEhZRTFGVVVOSlJtbFNaamxpWVc1bVpWcFlSV1k0UTFrMFRWUm1NVzFTWTFGc2JYcEJNVnBvZERCQmF6VkhkWGt4YlVGcFFtOU1XR2xrTmpGTFFVVk9iMGRvZDNZeVptaDVTM0l6TlRCTk1HMVhXR2xPVWs1TVFVYzVaV0ZGVlVFOVBRaFlNRll3RUFZSEtvWkl6ajBDQVFZRks0RUVBQW9EUWdBRW9XQ0thMFNhOUZJRXJUT3YwdUFrQzFWSUtYeFU5blBweDJ2bGY0eWhNZWp5OGMwMlhKYmxEcTd0UHlkbzhtcTBhaE9NbU5vOGd3bmk3WHQxS1Q5VWVBbEhNRVVDSVFDeFA0bklacDFsd2xDbEczR3Q4bkl2S0tzR2k3eFhSMVkwSzczaVBicWdHd0lnUFlRdURQSTREQVFBejBzNW5kcm9qeVFPb0NrZHl4Tk4xTytYcW13djYxdz08L2NiYzpFbWJlZGRlZERvY3VtZW50QmluYXJ5T2JqZWN0PgogICAgICAgIDwvY2FjOkF0dGFjaG1lbnQ+CjwvY2FjOkFkZGl0aW9uYWxEb2N1bWVudFJlZmVyZW5jZT48Y2FjOlNpZ25hdHVyZT4KICAgICAgPGNiYzpJRD51cm46b2FzaXM6bmFtZXM6c3BlY2lmaWNhdGlvbjp1Ymw6c2lnbmF0dXJlOkludm9pY2U8L2NiYzpJRD4KICAgICAgPGNiYzpTaWduYXR1cmVNZXRob2Q+dXJuOm9hc2lzOm5hbWVzOnNwZWNpZmljYXRpb246dWJsOmRzaWc6ZW52ZWxvcGVkOnhhZGVzPC9jYmM6U2lnbmF0dXJlTWV0aG9kPgo8L2NhYzpTaWduYXR1cmU+PGNhYzpBY2NvdW50aW5nU3VwcGxpZXJQYXJ0eT4KICAgICAgICA8Y2FjOlBhcnR5PgogICAgICAgICAgICA8Y2FjOlBhcnR5SWRlbnRpZmljYXRpb24+CiAgICAgICAgICAgICAgICA8Y2JjOklEIHNjaGVtZUlEPSJDUk4iPjEwMTAwMTAwMDA8L2NiYzpJRD4KICAgICAgICAgICAgPC9jYWM6UGFydHlJZGVudGlmaWNhdGlvbj4KICAgICAgICAgICAgPGNhYzpQb3N0YWxBZGRyZXNzPgogICAgICAgICAgICAgICAgPGNiYmM6U3RyZWV0TmFtZT7Yp9mE2KfZhdmK2LYg2LPZhNi32KfZhiB8IFByaW5jZSBTdWx0YW48L2NiYzpTdHJlZXROYW1lPgogICAgICAgICAgICAgICAgPGNiYmM6QnVpbGRpbmdOdW1iZXI+MjMyMjwvY2JjOkJ1aWxkaW5nTnVtYmVyPgogICAgICAgICAgICAgICAgPGNiYmM6Q2l0eVN1YmRpdmlzaW9uTmFtZT7Yp9mE2YXYsdio2LkgfCBBbC1NdXJhYmJhPC9jYmM6Q2l0eVN1YmRpdmlzaW9uTmFtZT4KICAgICAgICAgICAgICAgIDxjYmM6Q2l0eU5hbWU+2KfZhNix2YrYp9i2IHwgUml5YWRoPC9jYmM6Q2l0eU5hbWU+CiAgICAgICAgICAgICAgICA8Y2JjOlBvc3RhbFpvbmU+MjMzMzM8L2NiYzpQb3N0YWxab25lPgogICAgICAgICAgICAgICAgPGNhYzpDb3VudHJ5PgogICAgICAgICAgICAgICAgICAgIDxjYmM6SWRlbnRpZmljYXRpb25Db2RlPlNBPC9jYmM6SWRlbnRpZmljYXRpb25Db2RlPgogICAgICAgICAgICAgICAgPC9jYWM6Q291bnRyeT4KICAgICAgICAgICAgPC9jYWM6UG9zdGFsQWRkcmVzcz4KICAgICAgICAgICAgPGNhYzpQYXJ0eVRheFNjaGVtZT4KICAgICAgICAgICAgICAgIDxjYmM6Q29tcGFueUlEPjM5OTk5OTk5OTkwMDAwMzwvY2JjOkNvbXBhbnlJRD4KICAgICAgICAgICAgICAgIDxjYWM6VGF4U2NoZW1lPgogICAgICAgICAgICAgICAgICAgIDxjYmM6SUQ+VkFUPC9jYmM6SUQ+CiAgICAgICAgICAgICAgICA8L2NhYzpUYXhTY2hlbWU+CiAgICAgICAgICAgIDwvY2FjOlBhcnR5VGF4U2NoZW1lPgogICAgICAgICAgICA8Y2FjOlBhcnR5TGVnYWxFbnRpdHk+CiAgICAgICAgICAgICAgICA8Y2JjOlJlZ2lzdHJhdGlvbk5hbWU+2LTYsdmD2Kkg2KrZiNix2YrYryDYp9mE2KrZg9mG2YjZhNmI2KzZitinINio2KPZgti12Ykg2LPYsdi52Kkg2KfZhNmF2K3Yr9mI2K/YqSB8IE1heGltdW0gU3BlZWQgVGVjaCBTdXBwbHkgTFREPC9jYmM6UmVnaXN0cmF0aW9uTmFtZT4KICAgICAgICAgICAgPC9jYWM6UGFydHlMZWdhbEVudGl0eT4KICAgICAgICA8L2NhYzpQYXJ0eT4KICAgIDwvY2FjOkFjY291bnRpbmdTdXBwbGllclBhcnR5PgogICAgIDxjYWM6QWNjb3VudGluZ0N1c3RvbWVyUGFydHk+CiAgICAgICAgPGNhYzpQYXJ0eT4KICAgICAgICAgICAgPGNhYzpQb3N0YWxBZGRyZXNzPgogICAgICAgICAgICAgICAgPGNiYmM6U3RyZWV0TmFtZT7YtbmE2KfitNin2YTYr9mK2YYgfCBTYWxhaCBBbC1EaW48L2NiYzpTdHJlZXROYW1lPgogICAgICAgICAgICAgICAgPGNiYmM6QnVpbGRpbmdOdW1iZXI+MTExMTwvY2JjOkJ1aWxkaW5nTnVtYmVyPgogICAgICAgICAgICAgICAgPGNiYmM6Q2l0eVN1YmRpdmlzaW9uTmFtZT7Yp9mE2YXYsdmI2KwgfCBBbC1NdXJvb2o8L2NiYzpDaXR5U3ViZGl2aXNpb25OYW1lPgogICAgICAgICAgICAgICAgPGNiYmM6Q2l0eU5hbWU+2KfZhNix2YrYp9i2IHwgUml5YWRoPC9jYmM6Q2l0eU5hbWU+CiAgICAgICAgICAgICAgICA8Y2JjOlBvc3RhbFpvbmU+MTIyMjI8L2NiYzpQb3N0YWxab25lPgogICAgICAgICAgICAgICAgPGNhYzpDb3VudHJ5PgogICAgICAgICAgICAgICAgICAgIDxjYmM6SWRlbnRpZmljYXRpb25Db2RlPlNBPC9jYmM6SWRlbnRpZmljYXRpb25Db2RlPgogICAgICAgICAgICAgICAgPC9jYWM6Q291bnRyeT4KICAgICAgICAgICAgPC9jYWM6UG9zdGFsQWRkcmVzcz4KICAgICAgICAgICAgPGNhYzpQYXJ0eVRheFNjaGVtZT4KICAgICAgICAgICAgICAgIDxjYmM6Q29tcGFueUlEPjM5OTk5OTk5OTgwMDAwMzwvY2JjOkNvbXBhbnlJRD4KICAgICAgICAgICAgICAgIDxjYWM6VGF4U2NoZW1lPgogICAgICAgICAgICAgICAgICAgIDxjYmM6SUQ+VkFUPC9jYmM6SUQ+CiAgICAgICAgICAgICAgICA8L2NhYzpUYXhTY2hlbWU+CiAgICAgICAgICAgIDwvY2FjOlBhcnR5VGF4U2NoZW1lPgogICAgICAgICAgICA8Y2FjOlBhcnR5TGVnYWxFbnRpdHk+CiAgICAgICAgICAgICAgICA8Y2JjOlJlZ2lzdHJhdGlvbk5hbWU+2LTYsdmD2Kkg2YbZhdin2LDYrCDZgdin2KrZiNix2Kkg2KfZhNmF2K3Yr9mI2K/YqSB8IEZhdG9vcmEgU2FtcGxlcyBMVEQ8L2NiYzpSZWdpc3RyYXRpb25OYW1lPgogICAgICAgICAgICA8L2NhYzpQYXJ0eUxlZ2FsRW50aXR5PgogICAgICAgIDwvY2FjOlBhcnR5PgogICAgPC9jYWM6QWNjb3VudGluZ0N1c3RvbWVyUGFydHk+CiAgICA8Y2FjOlBheW1lbnRNZWFucz4KICAgICAgICA8Y2JjOlBheW1lbnRNZWFuc0NvZGU+MTA8L2NiYzpQYXltZW50TWVhbnNDb2RlPgogICAgPC9jYWM6UGF5bWVudE1lYW5zPgogICAgPGNhYzpBbGxvd2FuY2VDaGFyZ2U+CiAgICAgICAgPGNiYzpDaGFyZ2VJbmRpY2F0b3I+ZmFsc2U8L2NiYzpDaGFyZ2VJbmRpY2F0b3I+CiAgICAgICAgPGNiYzpBbGxvd2FuY2VDaGFyZ2VSZWFzb24+ZGlzY291bnQ8L2NiYzpBbGxvd2FuY2VDaGFyZ2VSZWFzb24+CiAgICAgICAgPGNiYzpBbW91bnQgY3VycmVuY3lJRD0iU0FSIj4wLjAwPC9jYmM6QW1vdW50PgogICAgICAgIDxjYWM6VGF4Q2F0ZWdvcnk+CiAgICAgICAgICAgIDxjYmM6SUQgc2NoZW1lSUQ9IlVOL0VDRSA1MzA1IiBzY2hlbWVBZ2VuY3lJRD0iNiI+UzwvY2JjOklEPgogICAgICAgICAgICA8Y2JjOlBlcmNlbnQ+MTU8L2NiYzpQZXJjZW50PgogICAgICAgICAgICA8Y2FjOlRheFNjaGVtZT4KICAgICAgICAgICAgICAgIDxjYmM6SUQgc2NoZW1lSUQ9IlVOL0VDRSA1MTUzIiBzY2hlbWVBZ2VuY3lJRD0iNiI+VkFUPC9jYmM6SUQ+CiAgICAgICAgICAgIDwvY2FjOlRheFNjaGVtZT4KICAgICAgICA8L2NhYzpUYXhDYXRlZ29yeT4KICAgICAgICA8Y2FjOlRheENhdGVnb3J5PgogICAgICAgICAgICA8Y2JjOklEIHNjaGVtZUlEPSJVTi9FQ0UgNTMwNSIgc2NoZW1lQWdlbmN5SUQ9IjYiPlM8L2NiYzpJRD4KICAgICAgICAgICAgPGNiYzpQZXJjZW50PjE1PC9jYmM6UGVyY2VudD4KICAgICAgICAgICAgPGNhYzpUYXhTY2hlbWU+CiAgICAgICAgICAgICAgICA8Y2JjOklEIHNjaGVtZUlEPSJVTi9FQ0UgNTE1MyIgc2NoZW1lQWdlbmN5SUQ9IjYiPlZBVDwvY2JjOklEPgogICAgICAgICAgICA8L2NhYzpUYXhTY2hlbWU+CiAgICAgICAgPC9jYWM6VGF4Q2F0ZWdvcnk+CiAgICA8L2NhYzpBbGxvd2FuY2VDaGFyZ2U+CiAgICA8Y2FjOlRheFRvdGFsPgogICAgICAgIDxjYmM6VGF4QW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MzAuMTU8L2NiYzpUYXhBbW91bnQ+CiAgICA8L2NhYzpUYXhUb3RhbD4KICAgIDxjYWM6VGF4VG90YWw+CiAgICAgICAgPGNiYmM6VGF4QW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MzAuMTU8L2NiYzpUYXhBbW91bnQ+CiAgICAgICAgPGNhYzpUYXhTdWJ0b3RhbD4KICAgICAgICAgICAgPGNiYmM6VGF4YWJsZUFtb3VudCBjdXJyZW5jeUlEPSJTQVIiPjIwMS4wMDwvY2JjOlRheGFibGVBbW91bnQ+CiAgICAgICAgICAgIDxjYmM6VGF4QW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MzAuMTU8L2NiYmM6VGF4QW1vdW50PgogICAgICAgICAgICAgPGNhYzpUYXhDYXRlZ29yeT4KICAgICAgICAgICAgICAgICA8Y2JjOklEIHNjaGVtZUlEPSJVTi9FQ0UgNTMwNSIgc2NoZW1lQWdlbmN5SUQ9IjYiPlM8L2NiYmM6SUQ+CiAgICAgICAgICAgICAgICA8Y2JjOlBlcmNlbnQ+MTUuMDA8L2NiYzpQZXJjZW50PgogICAgICAgICAgICAgICAgPGNhYzpUYXhTY2hlbWU+CiAgICAgICAgICAgICAgICAgICA8Y2JjOklEIHNjaGVtZUlEPSJVTi9FQ0UgNTE1MyIgc2NoZW1lQWdlbmN5SUQ9IjYiPlZBVDwvY2JjOklEPgogICAgICAgICAgICAgICAgPC9jYWM6VGF4U2NoZW1lPgogICAgICAgICAgICAgPC9jYWM6VGF4Q2F0ZWdvcnk+CiAgICAgICAgPC9jYWM6VGF4U3VidG90YWw+CiAgICA8L2NhYzpUYXhUb3RhbD4KICAgIDxjYWM6TGVnYWxNb25ldGFyeVRvdGFsPgogICAgICAgIDxjYmM6TGluZUV4dGVuc2lvbkFtb3VudCBjdXJyZW5jeUlEPSJTQVIiPjIwMS4wMDwvY2JjOkxpbmVFeHRlbnNpb25BbW91bnQ+CiAgICAgICAgPGNiYmM6VGF4RXhjbHVzaXZlQW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MjAxLjAwPC9jYmM6VGF4RXhjbHVzaXZlQW1vdW50PgogICAgICAgIDxjYmM6VGF4SW5jbHVzaXZlQW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MjMxLjE1PC9jYmM6VGF4SW5jbHVzaXZlQW1vdW50PgogICAgICAgIDxjYmM6QWxsb3dhbmNlVG90YWxBbW91bnQgY3VycmVuY3lJRD0iU0FSIj4wLjAwPC9jYmM6QWxsb3dhbmNlVG90YWxBbW91bnQ+CiAgICAgICAgPGNiYmM6UHJlcGFpZEFtb3VudCBjdXJyZW5jeUlEPSJTQVIiPjAuMDA8L2NiYzpQcmVwYWlkQW1vdW50PgogICAgICAgIDxjYmM6UGF5YWJsZUFtb3VudCBjdXJyZW5jeUlEPSJTQVIiPjIzMS4xNTwvY2JjOlBheWFibGVBbW91bnQ+CiAgICA8L2NhYzpMZWdhbE1vbmV0YXJ5VG90YWw+CiAgICA8Y2FjOkludm9pY2VMaW5lPgogICAgICAgIDxjYmM6SUQ+MTwvY2JjOklEPgogICAgICAgIDxjYmM6SW52b2ljZWRRdWFudGl0eSB1bml0Q29kZT0iUENFIj4zMy4wMDAwMDA8L2NiYzpJbnZvaWNlZFF1YW50aXR5PgogICAgICAgIDxjYmM6TGluZUV4dGVuc2lvbkFtb3VudCBjdXJyZW5jeUlEPSJTQVIiPjY5LjAwPC9jYmM6TGluZUV4dGVuc2lvbkFtb3VudD4KICAgICAgICA8Y2FjOlRheFRvdGFsPgogICAgICAgICAgICAgPGNiYmM6VGF4QW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MTQuODU8L2NiYzpUYXhBbW91bnQ+CiAgICAgICAgICAgICA8Y2JjOlJvdW5kaW5nQW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MTEzLjg1PC9jYmM6Um91bmRpbmdBbW91bnQ+CiAgICAgICAgPC9jYWM6VGF4VG90YWw+CiAgICAgICAgPGNhYzpJdGVtPgogICAgICAgICAgICA8Y2JjOk5hbWU+2YPYqtin2Kg8L2NiYzpOYW1lPgogICAgICAgICAgICA8Y2FjOkNsYXNzaWZpZWRUYXhDYXRlZ29yeT4KICAgICAgICAgICAgICAgIDxjYmM6SUQ+UzwvY2JjOklEPgogICAgICAgICAgICAgICAgPGNiYmM6UGVyY2VudD4xNS4wMDwvY2JjOlBlcmNlbnQ+CiAgICAgICAgICAgICAgICA8Y2FjOlRheFNjaGVtZT4KICAgICAgICAgICAgICAgICAgICA8Y2JjOklEPlZBVDwvY2JjOklEPgogICAgICAgICAgICAgICAgPC9jYWM6VGF4U2NoZW1lPgogICAgICAgICAgICA8L2NhYzpDbGFzc2lmaWVkVGF4Q2F0ZWdvcnk+CiAgICAgICAgPC9jYWM6SXRlbT4KICAgICAgICA8Y2FjOlByaWNlPgogICAgICAgICAgICA8Y2JjOlByaWNlQW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+My4wMDwvY2JjOlByaWNlQW1vdW50PgogICAgICAgIDwvY2FjOlByaWNlPgogICAgPC9jYWM6SW52b2ljZUxpbmU+CiAgICA8Y2FjOkludm9pY2VMaW5lPgogICAgICAgIDxjYmM6SUQ+MjwvY2JjOklEPgogICAgICAgIDxjYmM6SW52b2ljZWRRdWFudGl0eSB1bml0Q29kZT0iUENFIj4zLjAwMDAwMDwvY2JjOkludm9pY2VkUXVhbnRpdHk+CiAgICAgICAgPGNiYmM6TGluZUV4dGVuc2lvbkFtb3VudCBjdXJyZW5jeUlEPSJTQVIiPjEwMi4wMDwvY2JjOkxpbmVFeHRlbnNpb25BbW91bnQ+CiAgICAgICAgPGNhYzpUYXhUb3RhbD4KICAgICAgICAgICAgIDxjYmM6VGF4QW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MTUuMzA8L2NiYzpUYXhBbW91bnQ+CiAgICAgICAgICAgICA8Y2JjOlJvdW5kaW5nQW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MTE3LjMwPC9jYmM6Um91bmRpbmdBbW91bnQ+CiAgICAgICAgPC9jYWM6VGF4VG90YWw+CiAgICAgICAgPGNhYzpJdGVtPgogICAgICAgICAgICA8Y2JjOk5hbWU+2YLYhNmE8L2NiYzpOYW1lPgogICAgICAgICAgICA8Y2FjOkNsYXNzaWZpZWRUYXhDYXRlZ29yeT4KICAgICAgICAgICAgICAgIDxjYmM6SUQ+UzwvY2JjOklEPgogICAgICAgICAgICAgICAgPGNiYmM6UGVyY2VudD4xNS4wMDwvY2JjOlBlcmNlbnQ+CiAgICAgICAgICAgICAgICA8Y2FjOlRheFNjaGVtZT4KICAgICAgICAgICAgICAgICAgICA8Y2JjOklEPlZBVDwvY2JjOklEPgogICAgICAgICAgICAgICAgPC9jYWM6VGF4U2NoZW1lPgogICAgICAgICAgICA8L2NhYzpDbGFzc2lmaWVkVGF4Q2F0ZWdvcnk+CiAgICAgICAgPC9jYWM6SXRlbT4KICAgICAgICA8Y2FjOlByaWNlPgogICAgICAgICAgICA8Y2JjOlByaWNlQW1vdW50IGN1cnJlbmN5SUQ9IlNBUiI+MzQuMDA8L2NiYmM6UHJpY2VBbW91bnQ+CiAgICAgICAgPC9jYWM6UHJpY2U+CiAgICA8L2NhYzpJbnZvaWNlTGluZT4KPC9JbnZvaWNlPg=="
}
```

### Responses

#### 200 (HTTP OK)

Returned on successful validation of simplified invoice.

```json
{
  "validationResults": {
    "infoMessages": [
      {
        "type": "INFO",
        "code": "XSD_ZATCA_VALID",
        "category": "XSD validation",
        "message": "Complied with UBL 2.1 standards in line with ZATCA specifications",
        "status": "PASS"
      }
    ],
    "warningMessages": [],
    "errorMessages": [],
    "status": "PASS"
  },
  "reportingStatus": "REPORTED"
}
```

#### 202 (HTTP Accepted)

Returned when the invoice is reported with warnings

```json
{
  "validationResults": {
    "infoMessages": [
      {
        "type": "INFO",
        "code": "XSD_ZATCA_VALID",
        "category": "XSD validation",
        "message": "Complied with UBL 2.1 standards in line with ZATCA specifications",
        "status": "PASS"
      }
    ],
    "warningMessages": [
      {
        "type": "WARNING",
        "code": "BR-CO-17",
        "category": "EN_16931",
        "message": "VAT category tax amount (BT-117) = VAT category taxable amount (BT-116) x (VAT category rate (BT-119) / 100), rounded to two decimals.",
        "status": "WARNING"
      },
      {
        "type": "WARNING",
        "code": "BR-KSA-98",
        "category": "KSA",
        "message": "[BR-KSA-98] - The simplified invoice should be submitted within 24 hours of issuing the invoice.",
        "status": "WARNING"
      }
    ],
    "errorMessages": [],
    "status": "WARNING"
  },
  "reportingStatus": "REPORTED"
}
```

#### 400 (HTTP Bad Request)

Returned when the submitted request is invalid.

```json
{
  "validationResults": {
    "infoMessages": [
      {
        "type": "INFO",
        "code": "XSD_ZATCA_VALID",
        "category": "XSD validation",
        "message": "Complied with UBL 2.1 standards in line with ZATCA specifications",
        "status": "PASS"
      }
    ],
    "warningMessages": [],
    "errorMessages": [
      {
        "type": "ERROR",
        "code": "invalid-invoice-hash",
        "category": "INVOICE_HASHING_ERRORS",
        "message": "The invoice hash API body does not match the (calculated) Hash of the XML",
        "status": "ERROR"
      },
      {
        "type": "ERROR",
        "code": "invoiceHash_QRCODE_INVALID",
        "category": "QRCODE_VALIDATION",
        "message": "Invoice xml hash does not match with qr code invoice xml hash",
        "status": "ERROR"
      }
    ],
    "status": "ERROR"
  },
  "reportingStatus": "NOT_REPORTED"
}
```

#### 401 (Unauthorized)

Returned when username and password are not added or added as wrong values.

```json
{
  "timestamp": 1654514661409,
  "status": 401,
  "error": "Unauthorized",
  "message": ""
}
```

#### 406 (Not Acceptable)

Returned when accept version header is anything other than V2

```text
This Version is not supported or not provided in the header.
```

#### 409 (Conflict)

Invoice was already Reported successfully earlier.

```json
{
  "validationResults": {
    "infoMessages": [],
    "warningMessages": [],
    "errorMessages": [
      {
        "type": "ERROR",
        "code": null,
        "category": null,
        "message": "Invoice was already Reported successfully earlier.",
        "status": "ERROR"
      }
    ],
    "status": "ERROR"
  },
  "reportingStatus": "NOT_REPORTED"
}
```

#### 500 (HTTP Internal Server Error)

Returned when the service faces internal errors.

```json
{
  "category": "HTTP-Errors",
  "code": "500",
  "message": "Something went wrong and caused an Internal Server Error."
}
```

***

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

### validationResultsModel

An object representing the structure of the validation results returned by the API endpoints. Specifically, it includes the invoice hash, status, and lists of info, warning, and error messages.

| Property | Type |
| :--- | :--- |
| infoMessages | array of InfoModel |
| warningMessages | array of WarningModel |
| erroMessages | array of ErrorModel |
| status | string (enum: PASS, WARNING, ERROR) |

### InvoiceResultModel

An Object the represents the response of the API endpoint where it shows the results including status, warnings (if any), and error (if any)

| Property | Type |
| :--- | :--- |
| validationResults | object |
| reportingStatus | string (enum: REPORTED, NOT_REPORTED) |

### InvoiceRequest

An object representing the structure of the clearance endpoint request. Specifically, it has the the submitted document hash and the base64 representation of the invoice.

| Property | Type |
| :--- | :--- |
| invoiceHash | string |
| invoice | string (base64 encoded XML) |