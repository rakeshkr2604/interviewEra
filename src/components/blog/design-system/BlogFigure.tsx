import Image from 'next/image'

type BlogFigureProps = {
  src: string
  alt: string
  caption?: string
  priority?: boolean
  width?: number
  height?: number
}

export function BlogFigure({
  src,
  alt,
  caption,
  priority = false,
  width = 1600,
  height = 900,
}: BlogFigureProps) {
  return (
    <figure className="ie-blog-ds-figure">
      <div className="ie-blog-ds-figure__frame">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          sizes="(max-width: 768px) 100vw, 900px"
          className="ie-blog-ds-figure__img"
        />
      </div>
      {caption ? <figcaption className="ie-blog-ds-figure__caption">{caption}</figcaption> : null}
    </figure>
  )
}
