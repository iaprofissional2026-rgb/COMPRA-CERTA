import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  limit,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OperationType, handleFirestoreError } from './firestore';

export class NotificationService {
  static async requestPermission() {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações desktop');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static async sendLocalNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
    
    // Dispatch custom event for in-app toast
    const event = new CustomEvent('app-notification', { detail: { title, body } });
    window.dispatchEvent(event);
  }

  static listenForNotifications(userId: string, isAdmin: boolean = false) {
    // Listen for broadcast notifications
    const broadcastQuery = query(
      collection(db, 'notifications'),
      where('type', '==', 'broadcast'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubBroadcast = onSnapshot(broadcastQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          this.sendLocalNotification(data.title, data.body);
        }
      });
    });

    // Listen for targeted notifications
    const targetedQuery = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubTargeted = onSnapshot(targetedQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          this.sendLocalNotification(data.title, data.body);
        }
      });
    });

    // Listen for admin notifications
    let unsubAdmin = () => {};
    if (isAdmin) {
      const adminQuery = query(
        collection(db, 'notifications'),
        where('type', '==', 'admin_broadcast'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      unsubAdmin = onSnapshot(adminQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            this.sendLocalNotification(data.title, data.body);
          }
        });
      });
    }

    return () => {
      unsubBroadcast();
      unsubTargeted();
      unsubAdmin();
    };
  }

  static async checkOldLists(userId: string) {
    try {
      const q = query(
        collection(db, 'shopping_lists'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const lastList = snapshot.docs[0].data();
        const lastDate = lastList.createdAt.toDate();
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 7) {
          this.sendLocalNotification(
            'Lembrete de Compras',
            'Já faz uma semana desde sua última lista. Que tal reutilizar uma antiga?'
          );
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'shopping_lists');
    }
  }

  static async sendBroadcast(title: string, body: string) {
    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        body,
        type: 'broadcast',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'notifications');
    }
  }
}
