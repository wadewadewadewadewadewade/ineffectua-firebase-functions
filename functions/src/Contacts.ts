import * as admin from 'firebase-admin';
import {convertDocumentDataToContact, ContactsType, Contact} from "./Types";

export const getContacts = (
  userId: string
) => {
  const db = admin.firestore();
  return new Promise<ContactsType>((resolve, reject) => {
    db.collection('users')
      .doc(userId)
      .collection('contacts')
      .orderBy('name')
      .get()
      .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
        const contacts: ContactsType = {};
        const arr = querySnapshot.docs.map((d) => {
          const val = convertDocumentDataToContact(d);
          return val;
        });
        arr.forEach((d) => {
          if (d.key) {
            contacts[d.key] = d;
          }
        });
        resolve(contacts)
      })
      .catch(reject);
  });
};

export const addContact = (
  userId: string,
  contact: Contact
): Promise<Contact> => {
  const db = admin.firestore();
  return new Promise<Contact>((resolve, reject) => {
    if (contact.key) {
      // its an update
      const {key, ...data} = contact;
      db.collection('users')
        .doc(userId)
        .collection('contacts')
        .doc(key)
        .update(data)
        .then(() => resolve(contact))
        .catch(reject);
    } else {
      // it's a new record
      db.collection('users')
        .doc(userId)
        .collection('contacts')
        .add(contact)
        .then((d) => resolve(convertDocumentDataToContact(d)))
        .catch(reject);
    }
  });
};
