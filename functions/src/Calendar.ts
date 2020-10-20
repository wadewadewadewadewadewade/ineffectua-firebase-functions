import * as admin from 'firebase-admin';
import { convertDocumentDataToCalendarEntry, CalendarEntry, CalendarType } from "./Types";

export const getCalendar = (
  userId: string
) => {
  const db = admin.firestore();
  return new Promise<CalendarType>((resolve, reject) => {
    db.collection('users')
      .doc(userId)
      .collection('calendar')
      .orderBy('window.starts')
      .get()
      .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
        const dates: CalendarType = {};
        const arr = querySnapshot.docs.map((d) => {
          const val = convertDocumentDataToCalendarEntry(d);
          return val;
        });
        arr.forEach((d) => {
          if (d.key) {
            dates[d.key] = d;
          }
        });
        resolve(dates)
      })
      .catch(reject);
  });
};

export const addCalendarDate = (
  userId: string,
  date: CalendarEntry
): Promise<CalendarEntry> => {
  const db = admin.firestore();
  return new Promise<CalendarEntry>((resolve, reject) => {
    if (date.key !== '' && typeof date.key !== 'undefined') {
      // its an update
      const {key, ...data} = date;
      db.collection('users')
        .doc(userId)
        .collection('calendar')
        .doc(key)
        .update(data)
        .then(() => resolve(date))
        .catch(reject);
    } else {
      // it's a new record
      db.collection('users')
        .doc(userId)
        .collection('calendar')
        .add(date)
        .then((value) => {
          const newDate: CalendarEntry = {...date, key: value.id};
          resolve(newDate);
        })
        .catch(reject);
    }
  });
};
