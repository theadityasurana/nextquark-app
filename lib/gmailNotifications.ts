type NewEmailCallback = (threadId: string, messageId: string) => void;

export async function registerForPushNotifications(): Promise<void> {
  console.warn('[gmailNotifications] registerForPushNotifications stub called – no-op');
}

export async function checkForNewEmails(): Promise<void> {
  console.warn('[gmailNotifications] checkForNewEmails stub called – no-op');
}

export function setupNotificationListener(_onNewEmail: NewEmailCallback): () => void {
  console.warn('[gmailNotifications] setupNotificationListener stub called – no-op listener');
  // Return a cleanup function to match the expected contract
  return () => {
    // no-op
  };
}

