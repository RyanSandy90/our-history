// Keep real spaces and readable text in the document, including before hydration.
export default function StaggeredWords({ text, preventOrphans = false }: { text: string; preventOrphans?: boolean }) {
  const ending = preventOrphans ? /\S+\s+\S+\s*$/.exec(text) : null;
  if (ending) return <>
    <StaggeredWords text={text.slice(0, ending.index)} />
    <span className="history-text-keep"><StaggeredWords text={ending[0]} /></span>
  </>;
  return text.split(/(\s+)/).filter(Boolean).map((part, index) => /^\s+$/.test(part)
    ? part
    : <span className="history-text-word" key={index}>{part}</span>);
}
