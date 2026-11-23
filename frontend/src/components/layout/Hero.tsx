import { ChevronRight, BarChart3 } from "lucide-react"

const Hero = () => {
  return (
    <section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#060a12] dark:via-[#080d18] dark:to-[#060a12] flex items-center overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-600/[0.04] dark:via-indigo-600/[0.03] dark:to-purple-600/[0.04]" />
      <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/10 dark:bg-blue-400/20 rounded-full blur-2xl" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-indigo-400/10 dark:bg-indigo-400/15 rounded-full blur-2xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 dark:bg-blue-500/[0.04] rounded-full blur-3xl hidden dark:block" />

      <div className="relative max-w-7xl mx-auto text-center z-10">
        {/* Compact Badge */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 dark:from-blue-900/40 dark:to-indigo-900/40 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm border border-blue-200/50 dark:border-blue-700/50">
          <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Calculate Stock Market Charges</span>
          <ChevronRight className="h-3 w-3 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Compact Main Heading */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight">
          <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 bg-clip-text text-transparent">
            Smart Trading
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Starts Here
          </span>
        </h1>

        {/* Compact Subtitle */}
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Calculate all your trading charges instantly with our{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-medium">
            advanced calculator
          </span>
        </p>

        {/* Compact Stats */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
          {[{ label: "99.9% Accuracy" }, { label: "Real-time Updates" }, { label: "Multi-broker Support" }].map(
            (stat, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200/50 dark:border-slate-700/50"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium">{stat.label}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  )
}

export default Hero
