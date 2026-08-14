import Image from "next/image";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/layout/Reveal";
import { getAtmospherePhotos, type AtmospherePhoto } from "@/lib/atmosphere";
import styles from "./Atmosphere.module.css";

const PhotoTile = ({ photo, priority }: { photo: AtmospherePhoto; priority: boolean }) => (
  <>
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes="(min-width: 720px) 33vw, 50vw"
      className={styles.tileImage}
      priority={priority}
      placeholder="blur"
    />
    <div className={styles.scrim} aria-hidden="true" />
    <span className={styles.tileLabel}>{photo.label}</span>
  </>
);

export const Atmosphere = async () => {
  const photos = await getAtmospherePhotos();

  return (
    <section className={styles.section} aria-labelledby="atmosphere-heading">
      <div className="container">
        <Reveal>
          <SectionTitle id="atmosphere-heading" eyebrow="Атмосфера" title="Відчуй" accent="енергію залу" />
        </Reveal>

        <div className={styles.grid}>
          {photos.map((photo, i) => (
            <Reveal key={photo.id} delay={Math.min(i, 4) * 0.06} className={styles.tile}>
              <PhotoTile photo={photo} priority={i === 0} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
