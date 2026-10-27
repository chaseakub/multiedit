# Security

Please report reproducible security issues through this repository's private vulnerability reporting feature on GitHub. Do not include secrets or real customer data in a public issue.

The first release is an early utility for text inputs and textareas. It is not a general transaction system. A page can observe edits, autosave them, replace fields, or change its state while the panel is open. Review the preview and the site's saved result.

The extension does not interpret page text as executable instructions, run user-provided regular expressions or code, submit forms, or make network requests. Commands use a fixed local parser.
