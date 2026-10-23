import { ImageResponse } from 'next/og';
import Desenho from '@/components/DesenhoIcone';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export default function AppleIcon() {
  return new ImageResponse(<Desenho s={180} />, size);
}
