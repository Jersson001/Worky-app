import { supabase, uniqueTopic } from './supabaseConfig';
import { Product, ProductCategory, Project, Expense, Contact } from '../types';
import { getCurrentUserId } from './messagingService';

// ============ PRODUCTOS ============

export const saveProduct = async (product: Product): Promise<void> => {
  try {
    const userId = getCurrentUserId();

    const { error } = await supabase.from('products').upsert({
      id: product.id,
      user_id: userId,
      category_id: product.categoryId,
      name: product.name,
      price: product.price,
      image: product.image,
      images: product.images,
      description: product.description,
      stock: product.stock,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const listenToProducts = (
  callback: (products: Product[]) => void
): (() => void) => {
  const userId = getCurrentUserId();

  const subscription = supabase
    .channel(uniqueTopic(`products:${userId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` }, () => {
      loadProducts(userId, callback);
    })
    .subscribe();

  // Cargar productos iniciales
  loadProducts(userId, callback);

  return () => {
    void supabase.removeChannel(subscription);
  };
};

const loadProducts = async (
  userId: string,
  callback: (products: Product[]) => void
) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const products = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      images: p.images,
      description: p.description,
      stock: p.stock,
      categoryId: p.category_id,
    }));

    callback(products);
  } catch (error) {
    console.error('Error loading products:', error);
  }
};

// ============ CATEGORÍAS ============

export const saveCategory = async (category: ProductCategory): Promise<void> => {
  try {
    const userId = getCurrentUserId();

    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      user_id: userId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      cover_image: category.coverImage,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const listenToCategories = (
  callback: (categories: ProductCategory[]) => void
): (() => void) => {
  const userId = getCurrentUserId();

  const subscription = supabase
    .channel(uniqueTopic(`categories:${userId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` }, () => {
      loadCategories(userId, callback);
    })
    .subscribe();

  // Cargar categorías iniciales
  loadCategories(userId, callback);

  return () => {
    void supabase.removeChannel(subscription);
  };
};

const loadCategories = async (
  userId: string,
  callback: (categories: ProductCategory[]) => void
) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const categories = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      coverImage: c.cover_image,
    }));

    callback(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
  }
};

// ============ PROYECTOS ============

export const saveProject = async (
  contactId: string,
  project: Project
): Promise<void> => {
  try {
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      contact_id: contactId,
      name: project.name,
      value: project.value,
      stage: project.stage,
      description: project.description,
      priority: project.priority,
      start_date: project.startDate,
      end_date: project.endDate,
    });

    if (error) throw error;

    // Guardar gastos del proyecto
    for (const expense of project.expenses) {
      await saveExpense(contactId, project.id, expense);
    }
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const updateProject = async (
  contactId: string,
  projectId: string,
  updates: Partial<Project>
): Promise<void> => {
  try {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.value !== undefined) updateData.value = updates.value;
    if (updates.stage) updateData.stage = updates.stage;
    if (updates.startDate) updateData.start_date = updates.startDate;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('contact_id', contactId);

    if (error) throw error;
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
    await saveExpense(contactId, projectId, expense);
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

const saveExpense = async (
  contactId: string,
  projectId: string,
  expense: Expense
): Promise<void> => {
  const { error } = await supabase.from('expenses').upsert({
    id: expense.id,
    project_id: projectId,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
  });

  if (error) throw error;
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

export const savePaymentAccount = async (
  account: PaymentAccountData
): Promise<void> => {
  try {
    const userId = getCurrentUserId();

    const { error } = await supabase.from('payment_accounts').upsert({
      id: account.id,
      user_id: userId,
      bank_name: account.bankName,
      account_type: account.accountType,
      account_number: account.accountNumber,
      holder_name: account.holderName,
      color: account.color,
      icon_class: account.iconClass,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving payment account:', error);
    throw error;
  }
};

export const listenToPaymentAccounts = (
  callback: (accounts: PaymentAccountData[]) => void
): (() => void) => {
  const userId = getCurrentUserId();

  const subscription = supabase
    .channel(uniqueTopic(`payment_accounts:${userId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_accounts', filter: `user_id=eq.${userId}` }, () => {
      loadPaymentAccounts(userId, callback);
    })
    .subscribe();

  // Cargar cuentas iniciales
  loadPaymentAccounts(userId, callback);

  return () => {
    void supabase.removeChannel(subscription);
  };
};

const loadPaymentAccounts = async (
  userId: string,
  callback: (accounts: PaymentAccountData[]) => void
) => {
  try {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const accounts = (data || []).map((a: any) => ({
      id: a.id,
      bankName: a.bank_name,
      accountType: a.account_type,
      accountNumber: a.account_number,
      holderName: a.holder_name,
      color: a.color,
      iconClass: a.icon_class,
    }));

    callback(accounts);
  } catch (error) {
    console.error('Error loading payment accounts:', error);
  }
};

// ============ CONTACTOS - Actualizar con proyectos ============

export const updateContactWithProjects = async (contact: Contact): Promise<void> => {
  try {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('contacts')
      .update({
        client_name: contact.clientName,
        phone: contact.phone,
        status: contact.status,
        role: contact.role,
        notes: contact.notes,
      })
      .eq('id', contact.id)
      .eq('user_id', userId);

    if (error) throw error;

    // Guardar proyectos
    for (const project of contact.projects) {
      await saveProject(contact.id, project);
    }
  } catch (error) {
    console.error('Error updating contact:', error);
    throw error;
  }
};
