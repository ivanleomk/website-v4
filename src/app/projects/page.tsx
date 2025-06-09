import { Navigation } from "@/components/Navigation";
import { ProjectCard } from "@/components/ProjectCard";

const projects = [
  {
    title: "Instructor",
    description:
      "The most popular Python library for working with structured outputs from large language models (LLMs), boasting over 3 million monthly downloads. Built on top of Pydantic, it provides a simple, transparent, and user-friendly API to manage validation, retries, and streaming responses.",
    url: "https://github.com/567-labs/instructor",
    imageUrl: "/instructor.png",
  },
  {
    title: "Kura",
    description:
      "Kura helps you to discover high level user trends using language model summaries. It's a tool that helps you to make decisions based on the data you have.",
    url: "https://github.com/567-labs/kura",
    imageUrl: "/kura.png",
  },
  {
    title: "Choose Your Own Adventure",
    description:
      "Generate an entire choose your own adventure story with a single prompt, complete with characters, settings, plot twists. Each story choice comes with its own unique choices, images and even british narration.",
    url: "https://restate.dev/blog/from-prompt-to-adventures-creating-games-with-llms-and-restates-durable-functions/",
    imageUrl: "/cyoa.png",
  },
];

export default async function ProjectsPage() {
  return (
    <div className="bg-white min-h-screen">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            MY WORK
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-black leading-tight mb-6">
            Things I&apos;ve built,
            <br />
            all in one place
          </h1>
        </header>
        <div className="space-y-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={index}
              title={project.title}
              description={project.description}
              url={project.url}
              imageUrl={project.imageUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
