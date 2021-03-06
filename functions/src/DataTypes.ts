import * as admin from 'firebase-admin';
import {convertDocumentDataToDataType, DataTypesType, DataType} from "./Types";

export const getDataTypes = (
  userId: string
) => {
  const db = admin.firestore();
  return new Promise<DataTypesType>((resolve, reject) => {
    db.collection('users')
      .doc(userId)
      .collection('datatypes')
      .get()
      .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
        const datatypes: DataTypesType = {};
        const arr = querySnapshot.docs.map((d) => {
          const val = convertDocumentDataToDataType(d);
          return val;
        });
        arr.forEach((d) => {
          if (d.key) {
            datatypes[d.key] = d;
          }
        });
        resolve(datatypes)
      })
      .catch(reject);
  });
};

export const addDataType = (
  userId: string,
  datatype: DataType
): Promise<DataType> => {
  const db = admin.firestore();
  return new Promise<DataType>((resolve, reject) => {
    if (datatype.key !== '' && typeof datatype.key !== 'undefined') {
      // its an update
      const {key, ...data} = datatype;
      db.collection('users')
        .doc(userId)
        .collection('datatypes')
        .doc(key)
        .update(data)
        .then(() => resolve(datatype))
        .catch(reject);
    } else {
      // it's a new record
      db.collection('users')
        .doc(userId)
        .collection('datatypes')
        .add(datatype)
        .then((value) => {
          const newDatatype: DataType = {...datatype, key: value.id};
          resolve(newDatatype);
        })
        .catch(reject);
    }
  });
};

export const deleteDataType = async (
  userId: string,
  datatype: DataType
) => {
  const db = admin.firestore();
  return new Promise<DataType>(async (resolve, reject) => {
    try {
      if (datatype.key !== '' && typeof datatype.key !== 'undefined') {
        db.collection('users')
        .doc(userId)
        .collection('calendar')
          .doc(datatype.key)
          .delete()
          .then(() => resolve(datatype))
          .catch(reject);
      } else {
        reject('DataType ID missing');
      }
    } catch (err) {
      reject(err);
    }
  });
};
