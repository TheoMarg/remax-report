import { useModal360 } from '../../contexts/Modal360Context';

interface Props {
  agentId: number;
  name: string;
  className?: string;
  siblingIds?: number[];
}

export function AgentLink({ agentId, name, className = '', siblingIds }: Props) {
  const { openAgent } = useModal360();

  return (
    <button
      onClick={() => openAgent(agentId, siblingIds)}
      className={`hover:text-brand-blue hover:underline cursor-pointer text-left ${className}`}
    >
      {name}
    </button>
  );
}
