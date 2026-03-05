import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Modal360Shell } from '../components/modals/Modal360Shell';

type Modal360State =
  | { type: 'closed' }
  | { type: 'agent'; agentId: number }
  | { type: 'property'; propertyId: string };

interface Modal360Ctx {
  state: Modal360State;
  openAgent: (agentId: number, list?: number[]) => void;
  openProperty: (propertyId: string, list?: string[]) => void;
  close: () => void;
  navPrev: (() => void) | null;
  navNext: (() => void) | null;
}

const Modal360Context = createContext<Modal360Ctx | null>(null);

export function Modal360Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Modal360State>({ type: 'closed' });
  const [agentList, setAgentList] = useState<number[]>([]);
  const [propertyList, setPropertyList] = useState<string[]>([]);

  const openAgent = useCallback((agentId: number, list?: number[]) => {
    if (list) setAgentList(list);
    setPropertyList([]);
    setState({ type: 'agent', agentId });
  }, []);

  const openProperty = useCallback((propertyId: string, list?: string[]) => {
    if (list) setPropertyList(list);
    setAgentList([]);
    setState({ type: 'property', propertyId });
  }, []);

  const close = useCallback(() => {
    setState({ type: 'closed' });
    setAgentList([]);
    setPropertyList([]);
  }, []);

  // Navigation
  let navPrev: (() => void) | null = null;
  let navNext: (() => void) | null = null;

  if (state.type === 'agent' && agentList.length > 1) {
    const idx = agentList.indexOf(state.agentId);
    if (idx > 0) {
      const prevId = agentList[idx - 1];
      navPrev = () => setState({ type: 'agent', agentId: prevId });
    }
    if (idx >= 0 && idx < agentList.length - 1) {
      const nextId = agentList[idx + 1];
      navNext = () => setState({ type: 'agent', agentId: nextId });
    }
  }

  if (state.type === 'property' && propertyList.length > 1) {
    const idx = propertyList.indexOf(state.propertyId);
    if (idx > 0) {
      const prevId = propertyList[idx - 1];
      navPrev = () => setState({ type: 'property', propertyId: prevId });
    }
    if (idx >= 0 && idx < propertyList.length - 1) {
      const nextId = propertyList[idx + 1];
      navNext = () => setState({ type: 'property', propertyId: nextId });
    }
  }

  return (
    <Modal360Context.Provider value={{ state, openAgent, openProperty, close, navPrev, navNext }}>
      {children}
      <Modal360Shell />
    </Modal360Context.Provider>
  );
}

export function useModal360(): Modal360Ctx {
  const ctx = useContext(Modal360Context);
  if (!ctx) throw new Error('useModal360 must be used within Modal360Provider');
  return ctx;
}
