import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

export interface EventRegistration {
  userId: string;
  userEmail: string;
  userName: string;
  eventId: number;
  eventTitle: string;
  eventDate: Date;
  registeredAt: Date;
}

// Register user for an event
export async function registerForEvent(
  userId: string,
  userEmail: string,
  userName: string,
  eventId: number,
  eventTitle: string,
  eventDate: Date
): Promise<void> {
  const registrationsRef = collection(db, 'eventRegistrations');

  await addDoc(registrationsRef, {
    userId,
    userEmail,
    userName,
    eventId,
    eventTitle,
    eventDate,
    registeredAt: new Date(),
  });
}

// Get all registrations for a specific event
export async function getEventRegistrations(eventId: number): Promise<EventRegistration[]> {
  const registrationsRef = collection(db, 'eventRegistrations');
  const q = query(registrationsRef, where('eventId', '==', eventId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    ...doc.data(),
    eventDate: doc.data().eventDate.toDate(),
    registeredAt: doc.data().registeredAt.toDate(),
  } as EventRegistration));
}

// Get all registrations for a specific user
export async function getUserRegistrations(userId: string): Promise<EventRegistration[]> {
  const registrationsRef = collection(db, 'eventRegistrations');
  const q = query(registrationsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    ...doc.data(),
    eventDate: doc.data().eventDate.toDate(),
    registeredAt: doc.data().registeredAt.toDate(),
  } as EventRegistration));
}

// Get all registered users' emails
export async function getAllRegisteredUsersEmails(): Promise<string[]> {
  const registrationsRef = collection(db, 'eventRegistrations');
  const snapshot = await getDocs(registrationsRef);

  const emails = new Set<string>();
  snapshot.docs.forEach(doc => {
    emails.add(doc.data().userEmail);
  });

  return Array.from(emails);
}

// Cancel registration
export async function cancelRegistration(userId: string, eventId: number): Promise<void> {
  const registrationsRef = collection(db, 'eventRegistrations');
  const q = query(
    registrationsRef,
    where('userId', '==', userId),
    where('eventId', '==', eventId)
  );
  const snapshot = await getDocs(q);

  snapshot.docs.forEach(async (document) => {
    await deleteDoc(doc(db, 'eventRegistrations', document.id));
  });
}
