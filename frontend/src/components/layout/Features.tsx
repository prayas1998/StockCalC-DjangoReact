import { Card } from "@/components/ui/card"
import { Calculator, Shield, TrendingUp, Zap, Award } from "lucide-react"

const Features = () => {
  return (
    <section className="section-padding relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/30" />
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 px-6 py-3 rounded-full mb-6 shadow-sm">
            <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">Premium Features</span>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 bg-clip-text text-transparent mb-4 leading-tight pb-1">
            Why Choose Our Calculator?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Designed to make your trading decisions easier and more informed with enterprise-grade precision
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Calculator,
              title: "Complete Charge Breakdown",
              description: "Calculate all 8+ statutory charges including STT, SEBI fees, GST, stamp duty, and broker-specific costs",
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
            },
            {
              icon: Zap,
              title: "Advanced Trading Tools",
              description: "Position sizing calculator, profit target analysis, and comprehensive trade journaling with performance analytics",
              gradient: "from-amber-500 to-orange-500",
              bgGradient: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
            },
            {
              icon: TrendingUp,
              title: "Multi-Broker Support",
              description: "Accurate calculations for Dhan, Groww, and more brokers with their specific fee structures",
              gradient: "from-emerald-500 to-teal-500",
              bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
            },
          ].map((feature, index) => (
            <Card
              key={index}
              className={`group relative p-8 bg-gradient-to-br ${feature.bgGradient} border border-transparent dark:border-slate-800/60 shadow-lg hover:shadow-xl hover-glow transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/80 to-transparent dark:from-slate-700/80 dark:to-transparent transition-opacity duration-500" />

              <div className="relative z-10">
                <div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-300">
                  {feature.title}
                </h3>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>

              <div
                className={`absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-r ${feature.gradient} opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity duration-500`}
              />
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 px-4 py-2 rounded-full shadow-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Trusted by thousands of traders worldwide</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
