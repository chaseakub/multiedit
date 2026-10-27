# Privacy

Multiedit processes selected field values in the current browser tab. The extension does not send field values to a server, call a model, store history, or include analytics. It does not require an account or API key.

The extension requests `activeTab` and `scripting`. Clicking the extension or invoking its shortcut grants temporary access to the active page so it can display the selector and edit fields you select. It does not request persistent access to every website.

The page you are editing still controls its own behavior. Changing a field dispatches normal input/change events. A website may autosave those changes or transmit them to its own servers. Multiedit cannot undo emails, purchases, or other external effects. It never clicks Submit or Save for you.

Password fields and common payment, authentication and one-time-code fields are excluded. This is a best-effort filter, not a guarantee that every sensitive field on every website will be recognized. Only select information you intend to edit.

The public demo runs locally in your browser after loading. GitHub Pages and GitHub handle normal hosting requests under their own privacy policies. The demo does not send the text you enter to the project maintainer.

Issue reports and contributions on GitHub are public. Use invented data when reporting a problem; do not include customer records or credentials.
