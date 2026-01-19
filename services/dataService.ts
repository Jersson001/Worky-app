import { database } from './firebaseConfig';
import { ref, push, set, onValue, off, update, remove, query, orderByChild } from 'firebase/database';
import { Product, ProductCategory, Project, Expense, Contact } from '../types';
import { getCurrentUserId } from './messagingService';

// ============ PRODUCTOS ============

export const saveProduct = async (product: Product): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const productRef = ref(database, `users/${userId}/products/${product.id}`);
    await set(productRef, {
      ...product,
      // Convertir Date a timestamp si existe
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const productRef = ref(database, `users/${userId}/products/${productId}`);
    await remove(productRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const listenToProducts = (
  callback: (products: Product[]) => void
): (() => void) => {
  const userId = getCurrentUserId();
  const productsRef = ref(database, `users/${userId}/products`);

  const unsubscribe = onValue(productsRef, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((childSnapshot) => {
      products.push(childSnapshot.val());
    });
    callback(products);
  });

  return () => off(productsRef);
};

// ============ CATEGORÍAS ============

export const saveCategory = async (category: ProductCategory): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const categoryRef = ref(database, `users/${userId}/categories/${category.id}`);
    await set(categoryRef, category);
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const categoryRef = ref(database, `users/${userId}/categories/${categoryId}`);
    await remove(categoryRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const listenToCategories = (
  callback: (categories: ProductCategory[]) => void
): (() => void) => {
  const userId = getCurrentUserId();
  const categoriesRef = ref(database, `users/${userId}/categories`);

  const unsubscribe = onValue(categoriesRef, (snapshot) => {
    const categories: ProductCategory[] = [];
    snapshot.forEach((childSnapshot) => {
      categories.push(childSnapshot.val());
    });
    callback(categories);
  });

  return () => off(categoriesRef);
};

// ============ PROYECTOS ============

export const saveProject = async (contactId: string, project: Project): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const projectRef = ref(database, `users/${userId}/contacts/${contactId}/projects/${project.id}`);
    
    // Convertir fechas a timestamps para Firebase
    const projectData = {
      ...project,
      startDate: project.startDate instanceof Date ? project.startDate.getTime() : project.startDate,
      expenses: project.expenses.map(exp => ({
        ...exp,
        date: exp.date instanceof Date ? exp.date.getTime() : exp.date
      }))
    };
    
    await set(projectRef, projectData);
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const updateProject = async (contactId: string, projectId: string, updates: Partial<Project>): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const projectRef = ref(database, `users/${userId}/contacts/${contactId}/projects/${projectId}`);
    
    const updatesData: any = {};
    if (updates.startDate) {
      updatesData.startDate = updates.startDate instanceof Date ? updates.startDate.getTime() : updates.startDate;
    }
    if (updates.value !== undefined) updatesData.value = updates.value;
    if (updates.stage) updatesData.stage = updates.stage;
    if (updates.name) updatesData.name = updates.name;
    
    await update(projectRef, updatesData);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const addExpenseToProject = async (
  contactId: string,
  projectId: string,
  expense: Expense
): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const expenseRef = ref(database, `users/${userId}/contacts/${contactId}/projects/${projectId}/expenses/${expense.id}`);
    
    await set(expenseRef, {
      ...expense,
      date: expense.date instanceof Date ? expense.date.getTime() : expense.date
    });
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

// ============ CUENTAS BANCARIAS ============

export interface PaymentAccountData {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  color: string;
  iconClass: string;
}

export const savePaymentAccount = async (account: PaymentAccountData): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const accountRef = ref(database, `users/${userId}/paymentAccounts/${account.id}`);
    await set(accountRef, account);
  } catch (error) {
    console.error('Error saving payment account:', error);
    throw error;
  }
};

export const listenToPaymentAccounts = (
  callback: (accounts: PaymentAccountData[]) => void
): (() => void) => {
  const userId = getCurrentUserId();
  const accountsRef = ref(database, `users/${userId}/paymentAccounts`);

  const unsubscribe = onValue(accountsRef, (snapshot) => {
    const accounts: PaymentAccountData[] = [];
    snapshot.forEach((childSnapshot) => {
      accounts.push(childSnapshot.val());
    });
    callback(accounts);
  });

  return () => off(accountsRef);
};

// ============ CONTACTOS - Actualizar con proyectos ============

export const updateContactWithProjects = async (contact: Contact): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const contactRef = ref(database, `users/${userId}/contacts/${contact.id}`);
    
    // Convertir datos con fechas
    const contactData = {
      ...contact,
      lastMessageTime: contact.lastMessageTime instanceof Date ? contact.lastMessageTime.getTime() : contact.lastMessageTime,
      projects: contact.projects.map(proj => ({
        ...proj,
        startDate: proj.startDate instanceof Date ? proj.startDate.getTime() : proj.startDate,
        expenses: proj.expenses.map(exp => ({
          ...exp,
          date: exp.date instanceof Date ? exp.date.getTime() : exp.date
        }))
      }))
    };
    
    await set(contactRef, contactData);
  } catch (error) {
    console.error('Error updating contact:', error);
    throw error;
  }
};

