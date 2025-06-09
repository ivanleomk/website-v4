interface ProjectCardProps {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
}

export function ProjectCard({
  title,
  description,
  url,
  imageUrl,
}: ProjectCardProps) {
  return (
    <div className="w-full max-w-4xl mx-auto py-16">
      <div className="flex gap-12 items-center">
        <div className="flex-1 space-y-6">
          <h2 className="text-4xl font-bold text-black leading-tight">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {title}
              </a>
            ) : (
              title
            )}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            {description}
          </p>
          {url && (
            <div className="pt-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-base font-medium text-black hover:underline"
              >
                View Project →
              </a>
            </div>
          )}
        </div>
        {imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={imageUrl}
              alt={title}
              className="w-80 h-60 object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
