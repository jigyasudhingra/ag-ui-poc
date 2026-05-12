import type { ReactNode } from 'react';

import { DemoProviders } from '@/components/DemoProviders';

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <DemoProviders>{children}</DemoProviders>;
}
