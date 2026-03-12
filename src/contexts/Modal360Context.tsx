import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Modal360Shell } from '../components/modals/Modal360Shell';
import type { EntityRef } from '../lib/types';

interface Modal360Ctx {
  isOpen: boolean;
  current: EntityRef | null;
  stack: EntityRef[];
  openEntity: (ref: EntityRef) => void;
  // Convenience shortcuts
  openAgent: (agentId: number, list?: number[]) => void;
  openProperty: (propertyId: string, list?: string[]) => void;
  openOffice: (office: string) => void;
  openTeam: (teamId: number, label: string) => void;
  close: () => void;
  goBack: () => void;
  navPrev: (() => void) | null;
  navNext: (() => void) | null;
}

const Modal360Context = createContext<Modal360Ctx | null>(null);

export function Modal360Provider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<EntityRef[]>([]);
  const [peerList, setPeerList] = useState<EntityRef[]>([]);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;
  const isOpen = current !== null;

  const openEntity = useCallback((ref: EntityRef) => {
    setStack(prev => [...prev, ref]);
  }, []);

  const openAgent = useCallback((agentId: number, list?: number[]) => {
    if (list) {
      setPeerList(list.map(id => ({ type: 'agent' as const, id, label: `Agent ${id}` })));
    }
    setStack([{ type: 'agent', id: agentId, label: `Agent ${agentId}` }]);
  }, []);

  const openProperty = useCallback((propertyId: string, list?: string[]) => {
    if (list) {
      setPeerList(list.map(id => ({ type: 'property' as const, id, label: id })));
    }
    setStack([{ type: 'property', id: propertyId, label: propertyId }]);
  }, []);

  const openOffice = useCallback((office: string) => {
    setPeerList([]);
    setStack([{ type: 'office', id: office, label: office }]);
  }, []);

  const openTeam = useCallback((teamId: number, label: string) => {
    setPeerList([]);
    setStack([{ type: 'team', id: teamId, label }]);
  }, []);

  const close = useCallback(() => {
    setStack([]);
    setPeerList([]);
  }, []);

  const goBack = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : []);
  }, []);

  // Peer navigation (prev/next within same type list)
  let navPrev: (() => void) | null = null;
  let navNext: (() => void) | null = null;

  if (current && peerList.length > 1) {
    const idx = peerList.findIndex(p => p.type === current.type && p.id === current.id);
    if (idx > 0) {
      const prev = peerList[idx - 1];
      navPrev = () => setStack(s => [...s.slice(0, -1), prev]);
    }
    if (idx >= 0 && idx < peerList.length - 1) {
      const next = peerList[idx + 1];
      navNext = () => setStack(s => [...s.slice(0, -1), next]);
    }
  }

  return (
    <Modal360Context.Provider value={{
      isOpen, current, stack,
      openEntity, openAgent, openProperty, openOffice, openTeam,
      close, goBack, navPrev, navNext,
    }}>
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
