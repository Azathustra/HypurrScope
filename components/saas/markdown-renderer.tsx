export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <article className="whitespace-pre-line text-sm leading-7 text-white">
      {content}
    </article>
  );
}
