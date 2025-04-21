import { ChevronRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-200 to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-950 min-h-[40vh] flex items-center">
      <div className="max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full mb-8">
          <span className="text-primary text-sm font-medium">
            Calculate Stock Market Charges
          </span>
          <ChevronRight className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight sm:text-7xl mb-6">
          Smart Trading
          <br />
          Starts Here
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
          Calculate all your trading charges instantly with our advanced
          calculator.
        </p>
      </div>
    </section>
  );
};

export default Hero; 