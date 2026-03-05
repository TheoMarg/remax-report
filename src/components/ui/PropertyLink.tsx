import { useModal360 } from '../../contexts/Modal360Context';

interface Props {
  propertyId: string;
  code: string;
  className?: string;
  siblingIds?: string[];
}

export function PropertyLink({ propertyId, code, className = '', siblingIds }: Props) {
  const { openProperty } = useModal360();

  return (
    <button
      onClick={() => openProperty(propertyId, siblingIds)}
      className={`hover:text-brand-blue hover:underline cursor-pointer text-left ${className}`}
    >
      {code}
    </button>
  );
}
