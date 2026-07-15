import { useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';

/**
 * useSocketListener('driver_searchride', (data) => { ... })
 * useSocketListener(['ride_accepted', 'ride_rejected'], (data) => { ... })
 */
const useSocketListener = (types, callback) => {
  const { addListener, removeListener } = useSocket();
  const callbackRef = useRef(callback);

  // Always point to latest callback — no stale closure
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const stableCallback = data => callbackRef.current(data);
    const typeArray = Array.isArray(types) ? types : [types];

    typeArray.forEach(type => addListener(type, stableCallback));

    return () => {
      typeArray.forEach(type => removeListener(type, stableCallback));
    };
  }, []); // runs once — stableCallback never changes reference
};

export default useSocketListener;
