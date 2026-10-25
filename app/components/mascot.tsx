import { shopConfig } from '../lib/config';

export type MascotName = 'bot_avatar' | 'bot_chao' | 'bot_khong_biet';
/** 1x/2x pixel sizes exported for each mascot (files: {base}_{px}.webp + .png in public/images/chatbot). */
const SIZES: Record<MascotName, [number, number]> = { bot_avatar: [64, 128], bot_chao: [120, 240], bot_khong_biet: [80, 160] };

/** Mascot image: webp with png fallback. Decorative by default (empty alt); pass label for a named image.
 *  bot_avatar sits in a circle; bot_chao / bot_khong_biet are full-body, uncropped (object-fit: contain). */
export function Mascot({ name, size, label = '' }: { name: MascotName; size: number; label?: string }) {
  const base = (shopConfig.chatbot.mascots as Record<string, string>)[name];
  const round = name === 'bot_avatar';
  if (!base) return <span className={`bot-mascot is-empty${round ? ' is-round' : ''}`} data-mascot={name} style={{ width: size, height: size }} aria-hidden="true"/>;
  const [x1, x2] = SIZES[name];
  const set = (ext: string) => `${base}_${x1}.${ext} 1x, ${base}_${x2}.${ext} 2x`;
  return <picture className={`bot-mascot${round ? ' is-round' : ' is-full'}`} data-mascot={name}>
    <source type="image/webp" srcSet={set('webp')}/>
    <img src={`${base}_${x1}.png`} srcSet={set('png')} width={size} height={size} alt={label} {...(label ? {} : { 'aria-hidden': true })} loading="lazy" decoding="async"/>
  </picture>;
}
