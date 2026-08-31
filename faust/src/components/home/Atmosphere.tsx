import Image from "next/image"
import type { AtmospherePhotoView } from "@/types"

import { Reveal } from "@/components/layout/Reveal"
import { Beam } from "@/components/ui/Beam"
import { SectionTitle } from "@/components/ui/SectionTitle"
import { getAtmospherePhotos } from "@/lib/atmosphere"
import styles from "./Atmosphere.module.css"

const PhotoTile = ({ photo, priority }: { photo: AtmospherePhotoView; priority: boolean }) => (
  <>
    <Image
      src={photo.image}
      alt={photo.imageAlt}
      fill
      sizes='(min-width: 720px) 33vw, 50vw'
      className={styles.tileImage}
      priority={priority}
    />
    <div
      className={styles.scrim}
      aria-hidden='true'
    />
    <span className={styles.tileLabel}>{photo.label}</span>
  </>
)

export const Atmosphere = async () => {
  const photos = await getAtmospherePhotos()

  /**
   * Nothing to show is not a broken grid — the section steps aside instead, and
   * takes its divider with it, so the page does not end up with two beams in a
   * row. That is why the separator lives here and not in `page.tsx`.
   */
  if (photos.length === 0) return null

  return (
    <>
      <section
        className={styles.section}
        aria-labelledby='atmosphere-heading'
      >
        <div className='container'>
          <Reveal>
            <SectionTitle
              id='atmosphere-heading'
              eyebrow='Атмосфера'
              title='Відчуй'
              accent='енергію залу'
            />
          </Reveal>

          <div className={styles.grid}>
            {photos.map((photo, i) => (
              <Reveal
                key={photo.id}
                delay={Math.min(i, 4) * 0.06}
                className={styles.tile}
              >
                <PhotoTile
                  photo={photo}
                  priority={i === 0}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className='container'>
        <Beam />
      </div>
    </>
  )
}
