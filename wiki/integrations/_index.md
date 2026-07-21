# integrations/

External systems the extension depends on: **contract + quirks**, not vendor docs. These are the
highest-value pages in the wiki because both endpoints are **undocumented and change without notice**.
Each page records the live response shape with an **observation date** and how to re-capture it.

* [[claude-ai-usage-api]] — `claude.ai` org discovery + `/usage`; cookie auth; the `limits[]` shape.
* [[chatgpt-codex-usage-api]] — `chatgpt.com` session token + `/wham/usage`; bearer + account header.
