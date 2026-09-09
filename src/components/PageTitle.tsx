import { useState, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { SectionHelp, useSectionGuide } from './SectionHelp';

export function PageTitle({ children }: { children: ReactNode }) {
  const guide = useSectionGuide();
  const [helpOpen, setHelpOpen] = useState(false);
  return <>
    <div className="page-title-row">
      <h1>{children}</h1>
      <button className="text-button page-title-help" onClick={() => setHelpOpen(true)}>
        <CircleHelp size={16}/>{guide.title}
      </button>
    </div>
    {helpOpen && <SectionHelp onClose={() => setHelpOpen(false)}/>}
  </>;
}
