export function AgenticHubKeyTakeaways({ items }: { items: readonly string[] }) {
  return (
    <aside className="ie-agentic-hub-takeaways" aria-label="Key takeaways">
      <p className="ie-agentic-hub-takeaways__label">Key takeaways</p>
      <ul className="ie-agentic-hub-takeaways__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  )
}
