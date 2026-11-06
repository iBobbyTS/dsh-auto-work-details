# dsh-auto-work-details development

This plugin opens running work-detail groups and folds them when their segment ends. It does not replace Chat rendering or add a settings surface.

- Keep observation inside the owning Conversation; unresolved or mismatched scope must not fall back to the page. Embedded chats are separate owners.
- Use native disclosure controls so height, focus protection and following remain Chat-owned. Respect manual toggles within a running segment.
- The client owns and disposes its observer, listeners and scheduled frame. Keep Host behavior empty.
- [README](README.md) owns installation, supported display modes and user-visible limits. Verify affected behavior with `node --test test/*.test.mjs`; distinguish these checks from real Desktop UI validation.
