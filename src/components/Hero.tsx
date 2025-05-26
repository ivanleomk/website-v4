export function Hero() {
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 mix-blend-multiply"
          style={{
            backgroundImage: "url('/bg.png')",
            backgroundPosition: "center right",
            backgroundSize: "clamp(800px, 70vw, 1200px)",
            mask: "radial-gradient(ellipse 80% 60% at 70% 50%, black 0%, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 65%, transparent 80%)",
            WebkitMask:
              "radial-gradient(ellipse 80% 60% at 70% 50%, black 0%, black 30%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 65%, transparent 80%)",
          }}
        />
      </div>
      
      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6 sm:px-20">
        <div className="text-2xl font-bold text-gray-900">IL</div>
        <div className="flex gap-8 text-gray-700 font-[family-name:var(--font-lato)]">
          <a href="#" className="hover:text-gray-900">
            About
          </a>
          <a href="#" className="hover:text-gray-900">
            Blog
          </a>
          <a href="#" className="hover:text-gray-900">
            Projects
          </a>
        </div>
      </nav>

      {/* Main content - left aligned */}
      <main className="relative z-10 flex items-center min-h-[80vh] px-8 sm:px-20">
        <div className="max-w-5xl text-left">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-normal leading-tight text-gray-500 font-[family-name:var(--font-crimson)] mb-12">
            <span className="text-gray-900">Ivan</span> rambles on about LLM
            reliability, evals and UX design
          </h1>

          <div className="space-y-2 font-[family-name:var(--font-lato)] text-gray-600 text-lg sm:text-xl">
            <p>Engineer, Writer and Amateur designer</p>
            <p>
              Currently engineering at{" "}
              <a
                href="https://567stud.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 font-medium hover:text-purple-700"
              >
                567 labs
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}