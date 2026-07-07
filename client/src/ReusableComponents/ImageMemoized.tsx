import { memo } from 'react';
import { css } from '../../styled-system/css';

const ImageMemoized = memo(function ImageMemoized({
  picture,
}: {
  picture: string | null;
}) {
  if (picture) {
    console.log(picture);
    return (
      <img
        src={picture}
        alt="google profile image of the participant"
        className={css({
          width: '100%',
          maxWidth: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 'lg',
          backgroundColor: 'bg.canvas',
        })}
      />
    );
  } else {
    return (
      <div
        className={css({
          width: '100%',
          maxWidth: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 'lg',
          backgroundColor: 'bg.canvas',
        })}
      />
    );
  }
});

export default ImageMemoized;
