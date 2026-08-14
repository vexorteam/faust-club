import { Hero } from "@/components/home/Hero";
import { About } from "@/components/home/About";
import { BarHighlights } from "@/components/home/BarHighlights";
import { Atmosphere } from "@/components/home/Atmosphere";
import { Testimonials } from "@/components/home/Testimonials";
import { FindUs } from "@/components/home/FindUs";
import { Beam } from "@/components/ui/Beam";

const HomePage = () => (
  <>
    <Hero />
    <About />
    <div className="container">
      <Beam />
    </div>
    <BarHighlights />
    <div className="container">
      <Beam />
    </div>
    <Atmosphere />
    <div className="container">
      <Beam />
    </div>
    <Testimonials />
    <div className="container">
      <Beam />
    </div>
    <FindUs />
  </>
);

export default HomePage;
