import { Heart, TrendingUp } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

const Footer = () => {
  const navigate = useNavigate()

  const handleCalculatorClick = () => {
    // If we're already on the main page, scroll to calculator section
    if (window.location.pathname === '/dhan' || window.location.pathname === '/groww') {
      const calculatorSection = document.getElementById('calculator-section')
      if (calculatorSection) {
        calculatorSection.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // Navigate to main page and then scroll to calculator
      navigate('/dhan')
      setTimeout(() => {
        const calculatorSection = document.getElementById('calculator-section')
        if (calculatorSection) {
          calculatorSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }

  const handleToolsClick = () => {
    navigate('/tools')
    // Scroll to top of the page
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  return (
    <footer className="relative border-t bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5" />

      <div className="relative w-full py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  TradeSmart
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md leading-relaxed">
                Empowering traders with precision calculations and intelligent insights. Make informed decisions with
                our advanced trading tools.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={handleCalculatorClick}
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 cursor-pointer"
                  >
                    Calculator
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleToolsClick}
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 cursor-pointer"
                  >
                    Tools
                  </button>
                </li>
                <li>
                  <Link
                    to="/journal"
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                  >
                    Journal
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 opacity-50 cursor-not-allowed"
                  >
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span>© {new Date().getFullYear()} TradeSmart. Made with</span>
                <Heart className="h-4 w-4 text-red-500" />
                <span>for traders</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-500">
                <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 rounded-full">
                  Secure
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  Fast
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                  Reliable
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer