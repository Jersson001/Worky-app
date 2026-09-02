import { supabase, uniqueTopic } from './supabaseConfig';
import { Product, ProductCategory, Project, Expense, Contact, ProjectStage } from '../types';
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
  project: Project,
  contractorId?: string,
  clientId?: string
): Promise<void> => {
  try {
    const currentUserId = getCurrentUserId();
    const finalContractorId = contractorId || currentUserId;
    const isLeadContact = contactId.startsWith('lead_');
    const finalClientId = clientId || (contactId !== currentUserId && !isLeadContact ? contactId : null);

    const projectPayload: any = {
      id: project.id,
      contact_id: contactId,
      name: project.name,
      value: project.value,
      stage: project.stage,
      description: project.description,
      priority: project.priority,
      start_date: project.startDate ? new Date(project.startDate).toISOString() : new Date().toISOString(),
      end_date: project.endDate ? new Date(project.endDate).toISOString() : null,
      quote_code: (project as any).metadata?.quoteCode || null,
    };

    if (finalContractorId && !finalContractorId.startsWith('lead_')) {
      projectPayload.contractor_id = finalContractorId;
    }
    if (finalClientId && !finalClientId.startsWith('lead_')) {
      projectPayload.client_id = finalClientId;
    }

    let { error } = await supabase.from('projects').upsert(projectPayload);

    // Fallback si client_id / contractor_id aún no está en el schema cache de Supabase
    if (error && (error.message?.includes('client_id') || error.message?.includes('contractor_id') || error.code === 'PGRST204' || error.code === '42703')) {
      console.warn('[saveProject] Columna no sincronizada en caché de Supabase, reintentando inserción básica:', error.message);
      delete projectPayload.client_id;
      delete projectPayload.contractor_id;
      const fallbackRes = await supabase.from('projects').upsert(projectPayload);
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Error guardando proyecto en Supabase:', error);
      // No lanzar excepción fatal para evitar alertas molestas si el contacto ya se creó
      return;
    }

    // Guardar gastos del proyecto
    if (project.expenses) {
      for (const expense of project.expenses) {
        await saveExpense(contactId, project.id, expense);
      }
    }
  } catch (error) {
    console.error('Error saving project:', error);
  }
};

export const fetchProjectsForContact = async (
  contactId: string
): Promise<Project[]> => {
  try {
    const currentUserId = getCurrentUserId();

    let data: any[] | null = null;
    let error: any = null;

    // Un id de contacto manual es `lead_<uuid>`, que no es un uuid válido:
    // compararlo contra una columna uuid revienta la consulta entera.
    const esUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    if (currentUserId && esUuid(contactId)) {
      // Los proyectos DE ESTA conversación, no todos los míos.
      //
      // Antes las dos primeras condiciones eran `client_id.eq.<yo>` y
      // `contractor_id.eq.<yo>` sueltas, sin atar al contacto: devolvían todos
      // mis proyectos en cualquier chat, así que a un cliente al que solo le
      // había cotizado una vez le aparecían los proyectos de otros clientes.
      // La doble vía es que lo vean los DOS lados de la misma pareja, no que
      // cada uno vea todo lo suyo.
      const res = await supabase
        .from('projects')
        .select('*')
        .or(
          `contact_id.eq.${contactId},` +
            `and(contractor_id.eq.${currentUserId},client_id.eq.${contactId}),` +
            `and(contractor_id.eq.${contactId},client_id.eq.${currentUserId})`
        );
      data = res.data;
      error = res.error;
    } else if (currentUserId) {
      // Contacto manual: no tiene cuenta, así que solo puede ser por contact_id.
      const res = await supabase
        .from('projects')
        .select('*')
        .eq('contact_id', contactId);
      data = res.data;
      error = res.error;
    } else {
      const res = await supabase
        .from('projects')
        .select('*')
        .eq('contact_id', contactId);
      data = res.data;
      error = res.error;
    }

    // Fallback si la columna client_id o contractor_id no existe aún en el esquema o caché
    if (error && (error.message?.includes('client_id') || error.message?.includes('contractor_id') || error.code === 'PGRST204' || error.code === '42703')) {
      console.warn('[fetchProjectsForContact] Schema cache desactualizado. Consultando por contact_id:', error.message);
      const fallbackRes = await supabase
        .from('projects')
        .select('*')
        .eq('contact_id', contactId);
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Error cargando proyectos del contacto:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      value: Number(row.value) || 0,
      stage: row.stage as ProjectStage,
      description: row.description || '',
      priority: row.priority || 'medium',
      startDate: row.start_date ? new Date(row.start_date) : new Date(),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      expenses: [],
      metadata: row.quote_code ? { quoteCode: row.quote_code } : undefined
    }));
  } catch (err) {
    console.error('Error en fetchProjectsForContact:', err);
    return [];
  }
};

export const listenToProjects = (
  callback: () => void
): (() => void) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return () => {};

  const channel = supabase
    .channel(uniqueTopic(`projects:${currentUserId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
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
  qrImage?: string;
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
      qr_image: account.qrImage ?? null,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving payment account:', error);
    throw error;
  }
};

export const deletePaymentAccount = async (accountId: string): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const { error } = await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting payment account:', error);
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
      qrImage: a.qr_image || undefined,
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

/**
 * Borra un proyecto.
 *
 * Los gastos cuelgan de él con clave foránea y se van con la fila; si la base
 * no lo tiene en cascada, el borrado falla y se propaga en vez de callarse: un
 * proyecto que parece borrado y sigue ahí al recargar es peor que un error.
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) {
    console.error('Error borrando proyecto:', error);
    throw error;
  }
};

// ─── Cuentas de terceros ─────────────────────────────────────────────────────

export interface ThirdPartyAccountData {
  id: string;
  alias: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  documentId?: string;
}

export const saveThirdPartyAccount = async (
  account: ThirdPartyAccountData
): Promise<void> => {
  try {
    const userId = getCurrentUserId();

    const { error } = await supabase.from('third_party_accounts').upsert({
      id: account.id,
      user_id: userId,
      alias: account.alias,
      bank_name: account.bankName,
      account_type: account.accountType || null,
      account_number: account.accountNumber,
      holder_name: account.holderName,
      document_id: account.documentId ?? null,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving third party account:', error);
    throw error;
  }
};

export const deleteThirdPartyAccount = async (accountId: string): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const { error } = await supabase
      .from('third_party_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting third party account:', error);
    throw error;
  }
};

export const listenToThirdPartyAccounts = (
  callback: (accounts: ThirdPartyAccountData[]) => void
): (() => void) => {
  const userId = getCurrentUserId();

  const subscription = supabase
    .channel(uniqueTopic(`third_party_accounts:${userId}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'third_party_accounts', filter: `user_id=eq.${userId}` }, () => {
      loadThirdPartyAccounts(userId, callback);
    })
    .subscribe();

  loadThirdPartyAccounts(userId, callback);

  return () => {
    void supabase.removeChannel(subscription);
  };
};

const loadThirdPartyAccounts = async (
  userId: string,
  callback: (accounts: ThirdPartyAccountData[]) => void
) => {
  try {
    const { data, error } = await supabase
      .from('third_party_accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    callback((data || []).map((a: any) => ({
      id: a.id,
      alias: a.alias,
      bankName: a.bank_name,
      accountType: a.account_type || '',
      accountNumber: a.account_number,
      holderName: a.holder_name,
      documentId: a.document_id || undefined,
    })));
  } catch (error) {
    console.error('Error loading third party accounts:', error);
  }
};

