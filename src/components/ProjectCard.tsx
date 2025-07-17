import Image from 'next/image';

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
    <div className="w-full max-w-4xl mx-auto py-8 md:py-16">
      <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center">
        <div className="flex-1 space-y-4 md:space-y-6 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-black leading-tight">
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
          <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-2xl mx-auto md:mx-0">
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
          <div className="flex-shrink-0 order-first md:order-last">
            <Image
              src={imageUrl}
              alt={title}
              width={320}
              height={240}
              className="w-64 h-48 md:w-80 md:h-60 object-contain mx-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
