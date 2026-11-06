# DSH Auto Work Details

A small browser-side DSH plugin that expands a running work-detail group at the standard height and folds that group when its segment finishes.

## Behaviour

- Always on while the bundle is enabled; the plugin has no Settings entry.
- Only the conversation that owns the current composer is observed. Switching chats disposes the old observer and installs a new one for the active session; leaving Chat unmounts it.
- While a process group is running (`[data-shimmer]` is present on its header), a collapsed group is opened once through the native header click. That path uses Chat's own `initialize('bottom')` and follow logic, so the standard height cap and bottom-following are preserved.
- When the group stops running, the group is closed once through the same native control.
- Manual toggles during the same running segment are not fought: the observer reacts only to the transition into and out of the running phase.
- The synthetic click suppresses the header's `focus()` call, so opening a group does not steal the caret from the composer.

Earlier versions exposed a switch that stored `dsh-auto-work-details.enabled` in `localStorage`; the plugin now removes that leftover key when it loads.

## Limits

This is a DOM-level workaround, not a Chat extension point:

- It depends on Conversation's `[data-conversation-content]` / `[data-conversation-session]` scope and Chat's `[data-step-process]`, `[data-chat-group-key]`, `[data-shimmer]`, and `aria-expanded` markers. An unresolved or mismatched Conversation is left alone.
- It only works in modes that render a process-group header (Standard and Compact); Detailed and Verbose have no running group header to toggle.
- An auto-close is skipped when Chat's focus protection decides the group must stay visible, or when a whole-Turn fold is already animating that group.
- A future Chat update can change these markers without notice.

## Install

Install the directory as a DSH bundle into the target profile, for example:

```sh
dsh plugin --profile web add link:/Users/ibobby/Projects/dsh-plugin/dsh-auto-work-details
```

`dsh plugin ... add` links the package and also records `@local/dsh-auto-work-details` in the profile's `dsh.profile.bundles`; installing through the Plugin Manager performs the same steps.

## Verify

```sh
node --test test/*.test.mjs
```
