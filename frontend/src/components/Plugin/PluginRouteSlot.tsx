import React, { useContext, useEffect, useRef } from 'react';

export const PluginSlotRegistry = React.createContext<{
  register: (pluginId: string, el: HTMLElement | null) => void;
}>({ register: () => {} });

export function PluginRouteSlot({ pluginId }: { pluginId: string }) {
  const { register } = useContext(PluginSlotRegistry);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    register(pluginId, divRef.current);
    return () => {
      register(pluginId, null);
    };
  }, [pluginId, register]);

  return <div ref={divRef} className="w-full h-full" />;
}
