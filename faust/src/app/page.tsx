import { Hero } from "@/components/home/Hero";
import { About } from "@/components/home/About";
import { BarHighlights } from "@/components/home/BarHighlights";
import { Atmosphere } from "@/components/home/Atmosphere";
import { Testimonials } from "@/components/home/Testimonials";
import { FindUs } from "@/components/home/FindUs";
import { Beam } from "@/components/ui/Beam";
import { getSiteSettings } from "@/lib/settings";
import { getTestimonials } from "@/lib/testimonials";

const HomePage = async () => {
  const [settings, testimonials] = await Promise.all([getSiteSettings(), getTestimonials()]);

  return (
    <>
      <Hero settings={settings} />
      <About settings={settings} />
      <div className="container">
        <Beam />
      </div>
      <BarHighlights />
      <div className="container">
        <Beam />
      </div>
      {/* Atmosphere carries the divider that follows it: with no photos both go away */}
      <Atmosphere />
      <Testimonials testimonials={testimonials} />
      <div className="container">
        <Beam />
      </div>
      <FindUs settings={settings} />
    </>
  );
};

export default HomePage;
