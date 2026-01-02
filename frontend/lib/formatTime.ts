/**
 * Convert 24-hour time format to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "14:30" or "09:00")
 * @returns Time in 12-hour format (e.g., "2:30 PM" or "9:00 AM")
 */
export function formatTime(time24: string): string {
  if (!time24) return '';

  const [hours24, minutes] = time24.split(':');
  const hour24 = parseInt(hours24, 10);

  if (isNaN(hour24)) return time24;

  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12; // Convert 0 to 12 for midnight

  return `${hour12}:${minutes} ${period}`;
}
