import { Card } from "@/components/ui/card";
import { Calculator, Clock, Shield } from "lucide-react";

const Features = () => {
  return (
    <section className="section-padding">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">
            Why Choose Our Calculator?
          </h2>
          <p className="text-muted-foreground mt-4">
            Designed to make your trading decisions easier and more
            informed
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Calculator,
              title: "Accurate Calculations",
              description:
                "Get precise calculations for all charges based on latest rates",
            },
            {
              icon: Clock,
              title: "Real-time Updates",
              description:
                "Charges are updated instantly as you modify trade details",
            },
            {
              icon: Shield,
              title: "Reliable & Secure",
              description:
                "Your data is secure and calculations are verified",
            },
          ].map((feature, index) => (
            <Card key={index} className="p-6 glass">
              <feature.icon className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features; 