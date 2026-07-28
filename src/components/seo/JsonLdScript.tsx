interface JsonLdScriptProps {
  id: string;
  /** Pre-built JSON-LD object — skip the script tag when null/undefined. */
  data: unknown;
}

/** Safe JSON-LD injection — pass pre-built objects from `src/lib/seo/schema/jsonld.ts`. */
export function JsonLdScript({ id, data }: JsonLdScriptProps) {
  if (data == null) return null;
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
