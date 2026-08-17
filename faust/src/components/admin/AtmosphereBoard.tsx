import type { AtmospherePhoto } from "@/schemas/atmosphere";
import { AtmosphereTile } from "./AtmosphereTile";
import styles from "./AtmosphereBoard.module.css";

/**
 * The grid the home page mirrors. Order here is order there.
 */

export type AtmosphereBoardProps = { photos: readonly AtmospherePhoto[] };

export const AtmosphereBoard = ({ photos }: AtmosphereBoardProps) => {
  if (photos.length === 0) {
    return (
      <p className={styles.empty}>
        Фотографій ще немає. Секція «Атмосфера» на головній поки показує знімки, зашиті в код: на цей список вона
        перейде разом із завантаженням фото — наступним кроком.
      </p>
    );
  }

  return (
    <ul className={styles.grid}>
      {photos.map((photo, index) => (
        <AtmosphereTile key={photo.id} photo={photo} isFirst={index === 0} isLast={index === photos.length - 1} />
      ))}
    </ul>
  );
};
