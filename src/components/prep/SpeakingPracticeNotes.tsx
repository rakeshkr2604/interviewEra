import { PDF_RESOURCES, SPEAKING_PDF_USAGE } from '@/lib/prep/pdf-resources'

export function SpeakingPracticeNotes() {
  return (
    <div>
      <p>If you practise from a speaking sheet, use it this way:</p>
      <ul>
        {SPEAKING_PDF_USAGE.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {PDF_RESOURCES.length > 0 ? (
        <ul>
          {PDF_RESOURCES.map((file) => (
            <li key={file.id}>
              <a href={file.href} target="_blank" rel="noopener noreferrer">
                View {file.title}
              </a>
              {' · '}
              <a href={file.href} download={file.filename}>
                Download
              </a>
              . {file.description}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
