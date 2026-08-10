# Suppliers and Students removed from scope

Both features were built early in the project (Suppliers: PRs #16, #19, #21;
Students had a nav entry) but were later deleted entirely, not deferred (PRs
#39/#48). Both are handled by a different existing system SPCF already uses
— building and maintaining parallel versions here would duplicate data and
workflows that system already owns. `spcf-as`'s scope is deliberately
limited to Inventory, Transactions, and Series Receipts.

Payables was never built — it was never in scope to begin with, not a
removal.

## Consequences

Don't reintroduce Suppliers or Students without first confirming this
integration boundary has actually changed (i.e. SPCF wants this system to
take over what the other system currently owns).
