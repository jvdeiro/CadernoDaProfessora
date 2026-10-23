import { ImageResponse } from 'next/og';
import Desenho from '@/components/DesenhoIcone';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';
export default function Icon() {
  return new ImageResponse(<Desenho s={512} />, size);
}
