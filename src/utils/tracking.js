// Generate or retrieve persistent device ID
function getDeviceId() {
  const STORAGE_KEY = 'sliver_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

// Track an event to the backend
export async function trackEvent(bookTitle, eventType) {
  try {
    const response = await fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_id: getDeviceId(),
        book_title: bookTitle,
        event_type: eventType
      })
    });

    if (!response.ok) {
      console.error('Tracking failed:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    // Silently fail - tracking should never break the app
    console.error('Tracking error:', error);
    return false;
  }
}

// Convenience methods for each event type
export const trackUploadStarted = (bookTitle) =>
  trackEvent(bookTitle, 'upload_started');

export const trackDailyGoalReached = (bookTitle) =>
  trackEvent(bookTitle, 'daily_goal_reached');

export const trackFreedomStageReached = (bookTitle) =>
  trackEvent(bookTitle, 'freedom_stage_reached');
