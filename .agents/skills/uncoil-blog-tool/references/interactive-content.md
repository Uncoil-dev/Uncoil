# Interactive blog content

Use interaction when it helps the reader test, compare, or understand the article's central idea. Do not add a widget merely to decorate the page.

## Choose the interaction

| Article job | Preferred interaction |
| --- | --- |
| Understand traces, retries, failures, or evaluation decisions | Interactive trace or evaluation demo |
| Learn an SDK, API, prompt, or implementation technique | Editable code sandbox with visible output |
| Compare cost, thresholds, reliability, or operational choices | Focused calculator, checklist, explorer, or scenario widget |
| Explain a concept with no meaningful reader-controlled state | Static prose, diagram, or code block |

One strong interaction is normally enough. Place it beside the section where the reader needs it, explain what to try, provide a useful initial state, and state what the result means. The article must remain understandable without interaction.

## Implementation contract

Blog files remain CommonMark/Markdoc, never MDX or raw JSX. Use an existing approved custom tag when it fits. If no suitable tag exists:

1. Define the tag and validated attributes in the centralized Markdoc configuration used by `src/lib/markdoc-blog.ts`.
2. Create a focused React component under `src/components/blog/`; keep the server-rendered article static and put client behavior at the smallest leaf.
3. Register the component in the centralized map used by `src/components/blog/markdoc-rich-text.tsx`.
4. Add parser/validation tests, component behavior tests where practical, a real `.mdoc` example, keyboard controls, accessible labels, narrow-screen behavior, and a non-interactive explanation or fallback.
5. Keep examples deterministic and local. Never execute arbitrary reader code on the application server, expose secrets, mutate production data, or imply that simulated output is live telemetry.

Editable code should run only in an intentionally isolated browser sandbox or a narrowly scoped deterministic interpreter. If safe execution is not available, use editable code with a preview of expected output rather than pretending it ran.

Verify the rendered interaction at desktop and mobile widths, with keyboard navigation, then run `npm run test:content` and `npm run build`.
