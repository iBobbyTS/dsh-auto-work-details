# DSH Auto Work Details

A small browser-side DSH plugin that adds a **展开过程，完成后收起** switch to Settings → General, directly below **工作步骤展示**.

## Behaviour

- Only the conversation that owns the current composer is observed. Switching chats disposes the old observer and installs a new one for the active session; leaving Chat unmounts it.
- While a process group is running (`[data-shimmer]` is present on its header), a collapsed group is opened once through the native header click. That path uses Chat's own `initialize('bottom')` and follow logic, so the standard height cap and bottom-following are preserved.
- When the group stops running, the group is closed once through the same native control.
- Manual toggles during the same running segment are not fought: the observer reacts only to the transition into and out of the running phase.
- The synthetic click suppresses the header's `focus()` call, so opening a group does not steal the caret from the composer.

The preference is stored in `localStorage` as `dsh-auto-work-details.enabled` and defaults to on.

## Limits

This is a DOM-level workaround, not a Chat extension point:

- It depends on Chat's internal `[data-step-process]`, `[data-chat-group-key]`, `[data-shimmer]`, and `aria-expanded` markers.
- It only works in modes that render a process-group header (Standard and Compact); Detailed and Verbose have no running group header to toggle.
- An auto-close is skipped when Chat's focus protection decides the group must stay visible, or when a whole-Turn fold is already animating that group.
- A future Chat update can change these markers without notice.

The switch defaults to on. Turning it off leaves already-open groups as they are.

## Install

Install the directory as a DSH bundle into the target profile, for example:

```sh
dsh plugin --profile web add link:/Users/ibobby/Projects/dsh-plugin/dsh-auto-work-details
```

`dsh plugin ... add` links the package and also records `@local/dsh-auto-work-details` in the profile's `dsh.profile.bundles`; installing through the Plugin Manager performs the same steps.
