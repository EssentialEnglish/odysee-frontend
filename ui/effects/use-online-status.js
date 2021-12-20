import React from 'react';

export default function useOnlineStatus() {
  const [online, setOnline] = React.useState(window.navigator.onLine);
  const [wentOnlineTime, setWentOnlineTime] = React.useState(-1);
  const [wentOfflineTime, setWentOfflineTime] = React.useState(-1);

  React.useEffect(() => {
    function handleOnline(event) {
      setOnline(true);
      setWentOnlineTime(new Date(event.timeStamp));
    }

    function handleOffline(event) {
      setOnline(false);
      setWentOfflineTime(new Date(event.timeStamp));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  let deltaMs;
  if (online && wentOnlineTime !== -1 && wentOfflineTime !== -1) {
    deltaMs = wentOnlineTime - wentOfflineTime;
  }

  return {
    online,
    offlineDurationMs: deltaMs, // 'undefined' if offline.
  };
}
