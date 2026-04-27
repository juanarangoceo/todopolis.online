'use client';

import { usePathname } from 'next/navigation';
import { LucyChatButton } from './lucy-chat-button';

export function LucyChatHomeGuard() {
  const pathname = usePathname();
  
  if (pathname !== '/') {
    return null;
  }
  
  return <LucyChatButton />;
}
