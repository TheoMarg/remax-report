import { useModal360 } from '../../contexts/Modal360Context';
import type { EntityRef } from '../../lib/types';

interface Props {
  type: EntityRef['type'];
  id: string | number;
  label: string;
  className?: string;
}

export function EntityLink({ type, id, label, className = '' }: Props) {
  const { openEntity } = useModal360();

  return (
    <button
      onClick={() => openEntity({ type, id, label })}
      className={`hover:text-brand-blue hover:underline cursor-pointer text-left ${className}`}
    >
      {label}
    </button>
  );
}
