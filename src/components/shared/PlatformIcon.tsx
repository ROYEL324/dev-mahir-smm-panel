import {
  Camera,
  Globe,
  MessageCircle,
  Music2,
  Play,
  Share2,
  AtSign,
} from 'lucide-react';
import type { PlatformName } from '../../types/smm';

export function PlatformIcon({
  platform,
  className = 'w-4 h-4',
}: {
  platform: PlatformName;
  className?: string;
}) {
  switch (platform) {
    case 'Instagram':
      return <Camera className={`${className} text-fuchsia-400`} />;
    case 'Facebook':
      return <Share2 className={`${className} text-sky-400`} />;
    case 'YouTube':
      return <Play className={`${className} text-rose-400`} />;
    case 'TikTok':
      return <Music2 className={`${className} text-cyan-300`} />;
    case 'Telegram':
      return <MessageCircle className={`${className} text-sky-300`} />;
    case 'X':
      return <AtSign className={`${className} text-violet-200`} />;
    default:
      return <Globe className={`${className} text-violet-300`} />;
  }
}
