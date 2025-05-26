import Image from "next/image";

interface BlogCardProps {
  title: string;
  description: string;
  imageUrl: string;
}

export function BlogCard({ title, description, imageUrl }: BlogCardProps) {
  return (
    <div className="relative rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col max-w-sm mx-auto h-[480px] overflow-hidden group cursor-pointer">
      {/* Background Image */}
      <Image 
        src={imageUrl} 
        alt={title} 
        fill 
        className="object-cover transition-transform duration-300 group-hover:scale-105" 
      />
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-hover:bg-black/40" />
      
      {/* Content overlay */}
      <div className="relative z-10 p-8 flex flex-col h-full">
        {/* Title - fixed height */}
        <div className="h-32 mb-8 flex items-start">
          <h3 className="text-3xl font-black text-white font-[family-name:var(--font-crimson)] leading-tight drop-shadow-lg">
            {title}
          </h3>
        </div>

        {/* Spacer to push content down */}
        <div className="flex-grow" />

        {/* Description - fixed height */}
        <div className="h-32 mb-6 overflow-hidden">
          <p className="text-white/90 font-[family-name:var(--font-lato)] leading-relaxed text-sm drop-shadow-md">
            {description}
          </p>
        </div>

        {/* Read more link - positioned to the right */}
        <div className="mt-auto flex justify-end">
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium text-sm px-4 py-2 rounded-full hover:bg-white/30 hover:border-white/50 transition-all duration-200 font-[family-name:var(--font-lato)] drop-shadow-lg"
          >
            read more 
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
