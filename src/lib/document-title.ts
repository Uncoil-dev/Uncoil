/** Swaps the tab title and returns a function that puts the previous title back. */
export function setTemporaryTitle(doc: { title: string }, title: string) {
  const previous = doc.title;
  doc.title = title;
  return () => {
    doc.title = previous;
  };
}
