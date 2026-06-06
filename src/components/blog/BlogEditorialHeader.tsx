import Image from 'next/image';

export function BlogEditorialHeader({
  category,
  titleLine,
  titleAccent,
  singleTitle,
  description,
  readTime,
  updatedLabel,
  heroSrc,
  heroAlt,
}: {
  category: string;
  /** Two-line H1 — use with `titleAccent` */
  titleLine?: string;
  titleAccent?: string;
  /** Single-line H1 when not using split lines */
  singleTitle?: string;
  /** Omitted when hero image already carries the deck copy. */
  description?: string;
  readTime: string;
  updatedLabel: string;
  heroSrc: string;
  heroAlt: string;
}) {
  return (
    <header className="ie-blog-editorial-header">
      <div className="ie-blog-interview-anxiety-content">
        <p
          className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
          style={{ color: 'var(--accent-primary)' }}
        >
          {category}
        </p>
        <h1 className={`ie-blog-article-h1${singleTitle ? ' ie-blog-article-h1--single' : ''}`}>
          {singleTitle ? (
            singleTitle
          ) : (
            <>
              <span className="ie-blog-article-h1__line">{titleLine}</span>
              {titleAccent ? <span className="ie-blog-article-h1__accent">{titleAccent}</span> : null}
            </>
          )}
        </h1>
        {description ? <p className="ie-blog-article-deck">{description}</p> : null}
        <div
          className="ie-blog-article-meta flex flex-wrap gap-2 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>{readTime}</span>
          <span aria-hidden>·</span>
          <span>{updatedLabel}</span>
        </div>
      </div>
      <div className="ie-blog-editorial-hero">
        <Image src={heroSrc} alt={heroAlt} fill priority sizes="(max-width: 768px) 100vw, 920px" className="object-cover" />
      </div>
    </header>
  );
}

export function BlogEditorialToc({
  sections,
  twoColumnList = false,
}: {
  sections: readonly { id: string; label: string }[];
  /** Split link list into two columns on sm+ (wider TOCs). */
  twoColumnList?: boolean;
}) {
  return (
    <nav className="ie-blog-toc-compact" aria-label="Quick navigation">
      <p className="ie-blog-toc-compact__label">Quick Navigation</p>
      <ul className={`ie-blog-toc-compact__list${twoColumnList ? ' ie-blog-toc-compact__list--2col' : ''}`}>
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a href={`#${id}`} className="ie-blog-inline-link">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BlogEditorialFaq({
  items,
}: {
  items: readonly { question: string; answer: string }[];
}) {
  return (
    <div className="ie-blog-faq-stack">
      {items.map((item) => (
        <section key={item.question} className="ie-blog-faq-item">
          <h3 className="ie-blog-faq-item__question">{item.question}</h3>
          <p className="ie-blog-faq-item__answer">{item.answer}</p>
        </section>
      ))}
    </div>
  );
}
