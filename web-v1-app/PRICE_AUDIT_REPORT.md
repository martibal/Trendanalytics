# Urd Atlas price 49/149 audit patch

Audit result from the uploaded src.zip:

- Exact old price strings found: 0
  - $29: 0
  - $79: 0
  - 29/mo: 0
  - 79/mo: 0
  - Basic $29: 0
  - Pro $79: 0

Current landing page pricing already uses:
- Single Chain $49/mo
- Research $149/mo

This patch fixes stale user-facing plan labels found elsewhere:
- Dashboard/account tier label: Basic -> Single Chain
- Dashboard/account tier label: Pro -> Research
- Chain history copy: "Basic or Pro subscription" -> "Single Chain or Research subscription"
- Landing use case copy: "Pro API key" -> "Research API key"
- Legacy copied landing explanation file, if present: Basic/Pro subscription wording -> Single Chain/Research

Internal subscription enum names are not renamed:
- `basic`
- `pro`

Those should remain unchanged because they are database/auth entitlement identifiers, not public pricing copy.
