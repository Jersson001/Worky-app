
import React, { useState } from 'react';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
// import { FinancialReport } from './components/FinancialReport';
import { StatusView } from './components/StatusView';
import { WalletModal } from './components/WalletModal';
import { SignaturePad } from './components/SignaturePad';
// import { NotificationsPanel } from './components/NotificationsPanel';
import { Contact, Message, UserStatus, ProjectStage, Product, Expense, Story, PaymentAccount, ThirdPartyAccount, ContactRole, Project, ProductCategory } from './types';
import { LoginScreen } from './components/LoginScreen';

// Mock Data
const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    clientName: 'Juan Pérez',
    avatar: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=150&q=80',
    phone: '+57 300 123 4567',
    status: UserStatus.Client,
    role: 'client',
    projects: [
        {
            id: 'p1',
            name: 'Cocina Integral',
            value: 20000000,
            stage: ProjectStage.InProgress,
            startDate: new Date(),
            expenses: [
                { id: 'e1', description: 'Madera Cedro y Triplex', amount: 4500000, date: new Date(new Date().setMonth(new Date().getMonth() - 5)), category: 'material' },
                { id: 'e2', description: 'Adelanto Carpintero Juan', amount: 1200000, date: new Date(new Date().setMonth(new Date().getMonth() - 4)), category: 'labor' },
                { id: 'e3', description: 'Herrajes y Manijas', amount: 850000, date: new Date(new Date().setMonth(new Date().getMonth() - 2)), category: 'material' },
                { id: 'e4', description: 'Almuerzos equipo', amount: 45000, date: new Date(), category: 'other' }
            ]
        }
    ],
    lastMessage: '💸 Gasto registrado: Almuerzos equipo',
    lastMessageTime: new Date(),
    unreadCount: 0,
  },
  {
    id: '2',
    clientName: 'Marta Rodríguez',
    avatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=150&q=80',
    phone: '+57 310 987 6543',
    status: UserStatus.Lead,
    role: 'client',
    projects: [
        {
            id: 'p2',
            name: 'Mobiliario Restaurante La Sazón',
            value: 8500000,
            stage: ProjectStage.Proposal,
            startDate: new Date(),
            expenses: [
                { id: 'e1', description: 'Transporte visita técnica', amount: 50000, date: new Date(new Date().setMonth(new Date().getMonth() - 1)), category: 'other' }
            ]
        }
    ],
    lastMessage: 'Quedamos atentos a la cotización final.',
    lastMessageTime: new Date(Date.now() - 3600000),
    unreadCount: 1,
  },
  {
    id: '4',
    clientName: 'Maderas El Roble',
    avatar: 'https://ui-avatars.com/api/?name=Maderas+El+Roble&background=6366f1&color=fff',
    phone: '+57 311 000 1111',
    status: UserStatus.Client,
    role: 'supplier',
    projects: [], // Suppliers might not have projects, or they act as "External"
    lastMessage: 'Pedido despachado.',
    lastMessageTime: new Date(Date.now() - 100000000),
    unreadCount: 0,
  }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1', text: 'Buenas tardes, aquí le envío las medidas de la cocina.', sender: 'other', timestamp: new Date(Date.now() - 1000000), type: 'text' },
    { id: 'm2', text: 'Perfecto Juan, ya compramos la madera de cedro. El proyecto va en $20M como acordamos.', sender: 'me', timestamp: new Date(Date.now() - 800000), type: 'text' },
    { id: 'm3', text: 'Listo, ¿cuándo instalan?', sender: 'other', timestamp: new Date(Date.now() - 600000), type: 'text' },
    { id: 'sys1', text: 'Gasto registrado: Almuerzos equipo (-$45.000)', sender: 'me', timestamp: new Date(), type: 'text', metadata: { isSystem: true } },
  ],
  '2': [
    { id: 'm1', text: 'Hola, vi sus trabajos en Instagram.', sender: 'other', timestamp: new Date(Date.now() - 7200000), type: 'text' },
    { id: 'm2', text: 'Hola Marta, claro que sí. ¿Qué tipo de mobiliario necesitan?', sender: 'me', timestamp: new Date(Date.now() - 3600000), type: 'text' },
  ],
  '4': [
      { id: 'm1', text: 'Hola, necesito 10 láminas de RH.', sender: 'me', timestamp: new Date(Date.now() - 200000000), type: 'text' }
  ]
};

const MOCK_CATEGORIES: ProductCategory[] = [
  { id: 'cat1', name: 'Cocinas', icon: 'fa-kitchen-set', color: 'bg-orange-500' },
  { id: 'cat2', name: 'Closets', icon: 'fa-shirt', color: 'bg-blue-500' },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Metro Lineal Cocina', price: 1200000, image: 'https://placehold.co/100x100/1e293b/white?text=Cocina', description: 'Material RH Resistente Humedad', categoryId: 'cat1' },
  { id: 'p2', name: 'Closet Empotrado', price: 2500000, image: 'https://placehold.co/100x100/1e293b/white?text=Closet', description: 'Diseño moderno puertas corredizas', categoryId: 'cat2' },
];

const MOCK_STORIES: Story[] = [
    { id: 's1', contactId: '2', content: 'Oferta especial en maderas este fin de semana', type: 'text', timestamp: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() + 86400000), color: '#3b82f6' }
];

const MOCK_ACCOUNTS: PaymentAccount[] = [
  { id: 'a1', bankName: 'Bancolombia', accountType: 'Ahorros', accountNumber: '234-567890-12', holderName: 'Carpintería SAS', color: '#fdd835', iconClass: 'fa-solid fa-building-columns' },
  { id: 'a2', bankName: 'Nequi', accountType: 'Celular', accountNumber: '300 123 4567', holderName: 'Admin', color: '#6f00ef', iconClass: 'fa-solid fa-mobile-screen' },
];

const MOCK_THIRD_PARTY: ThirdPartyAccount[] = [
    { id: 'tp1', alias: 'Proveedor Maderas El Roble', bankName: 'Bancolombia', accountNumber: '987-654321-00', accountType: 'Corriente', holderName: 'Maderas El Roble SAS', documentId: '900.123.123' },
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'chats'>('home');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showFinancials, setShowFinancials] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  // const [showNotifications, setShowNotifications] = useState(false);
  const [chatAction, setChatAction] = useState<'invoice' | 'quote' | 'collection_account' | 'expense' | null>(null);
  const [pendingDocumentAction, setPendingDocumentAction] = useState<'invoice' | 'quote' | 'collection_account' | 'expense' | null>(null);
  const [showClientSelectionModal, setShowClientSelectionModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<ContactRole>('client');
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [savedAccounts, setSavedAccounts] = useState<ThirdPartyAccount[]>(MOCK_THIRD_PARTY);
  const [startCamera, setStartCamera] = useState(false);
  const [showCatalogManager, setShowCatalogManager] = useState(false);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categories, setCategories] = useState<ProductCategory[]>(MOCK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [newProductCategory, setNewProductCategory] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('fa-box');
  const [catalogView, setCatalogView] = useState<'folders' | 'products'>('folders');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState<number>(0);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [documents, setDocuments] = useState<Array<{id: string, name: string, type: string, file: string, uploadDate: Date, description?: string}>>([]);
  const [editingDocument, setEditingDocument] = useState<{id: string, name: string, type: string, file: string, uploadDate: Date, description?: string} | null>(null);
  const [documentDescription, setDocumentDescription] = useState('');
  const [businessLogo, setBusinessLogo] = useState<string>('');
  const [digitalSignature, setDigitalSignature] = useState<string>('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleSendMessage = (text: string, type: 'text' | 'invoice' | 'product' | 'receipt' | 'quote' | 'collection_account' | 'payment_info' | 'expense_receipt' = 'text', metadata?: any) => {
    if (!selectedContactId) return;
    const newMessage: Message = { id: Date.now().toString(), text, sender: 'me', timestamp: new Date(), type, metadata };
    setMessages(prev => ({ ...prev, [selectedContactId]: [...(prev[selectedContactId] || []), newMessage] }));
    setContacts(prev => prev.map(c => c.id === selectedContactId ? { ...c, lastMessage: type === 'text' ? text : '📎 Documento adjunto', lastMessageTime: new Date() } : c));
  };
  
  const handleUpdateMessageMetadata = (messageId: string, updatedMessage: any) => {
    if (!selectedContactId) return;
    
    // 1. Update the message itself
    setMessages(prev => {
        const chatMessages = prev[selectedContactId] || [];
        return {
            ...prev,
            [selectedContactId]: chatMessages.map(msg => 
                msg.id === messageId ? { ...msg, ...updatedMessage } : msg
            )
        };
    });

    // 2. Business Logic: If Quote Approved -> Create New Project
    if (updatedMessage.metadata?.status === 'accepted') {
       // Find the message to get total and details
       const currentMessages = messages[selectedContactId] || [];
       const targetMessage = currentMessages.find(m => m.id === messageId);
       
       if (targetMessage && targetMessage.metadata) {
           // Use first item's description as project name, or fallback to "Proyecto [code]"
           const projectName = targetMessage.metadata.items && targetMessage.metadata.items.length > 0 
               ? targetMessage.metadata.items[0].description 
               : `Proyecto ${targetMessage.metadata.number}`;
           
           const newProject: Project = {
               id: Date.now().toString(),
               name: projectName,
               value: targetMessage.metadata.total,
               stage: ProjectStage.InProgress,
               expenses: [],
               startDate: new Date(),
               metadata: { quoteCode: targetMessage.metadata.number }
           };

           // Add Project to Contact
           setContacts(prev => prev.map(c => 
               c.id === selectedContactId 
               ? { ...c, projects: [newProject, ...c.projects] } // Add to top
               : c
           ));

           setTimeout(() => {
                handleSendMessage(`✅ Cotización Aprobada. Se ha creado el proyecto: "${newProject.name}"`, 'text', { isSystem: true });
           }, 500);
       }
    }
  };

  const handleUpdateStage = (stage: ProjectStage, projectId: string) => { 
      if (selectedContactId) {
          setContacts(prev => prev.map(c => {
              if (c.id === selectedContactId) {
                  return {
                      ...c,
                      projects: c.projects.map(p => p.id === projectId ? { ...p, stage } : p)
                  };
              }
              return c;
          }));
      }
  };

  const handleUpdateProjectInfo = (value: number, name: string, projectId: string) => { 
      if (selectedContactId) {
          setContacts(prev => prev.map(c => {
              if (c.id === selectedContactId) {
                  return {
                      ...c,
                      projects: c.projects.map(p => p.id === projectId ? { ...p, value: value, name: name } : p)
                  };
              }
              return c;
          }));
      }
  };

  const handleAddExpense = (amount: number, description: string, targetProjectId?: string) => {
    if (!selectedContactId) return;
    
    const newExpense: Expense = { id: Date.now().toString(), amount, description, date: new Date(), category: 'other', projectId: targetProjectId };

    setContacts(prev => prev.map(c => {
        // If targetProjectId is provided, find the contact who has this project and add expense there
        if (targetProjectId) {
            const projectExists = c.projects.find(p => p.id === targetProjectId);
            if (projectExists) {
                 return {
                    ...c,
                    projects: c.projects.map(p => p.id === targetProjectId ? { ...p, expenses: [...p.expenses, newExpense] } : p)
                 };
            }
        } 
        // If NO targetProjectId, default to selected contact (only if it's the one being iterated and has projects)
        else if (c.id === selectedContactId) {
             if (c.projects.length > 0) {
                 // Add to first project by default
                 return {
                    ...c,
                    projects: c.projects.map((p, idx) => idx === 0 ? { ...p, expenses: [...p.expenses, { ...newExpense, projectId: p.id }] } : p)
                 };
             }
        }
        return c;
    }));

    // Ya no creamos mensaje aquí, se crea el recibo en ChatWindow.handleSaveExpense
  };
  
  const handleAddStory = (content: string, type: 'text' | 'image', durationHours: number, color?: string) => setStories(prev => [{ id: Date.now().toString(), contactId: 'me', content, type, timestamp: new Date(), expiresAt: new Date(Date.now() + (durationHours * 3600000)), color }, ...prev]);
  const handleSendWalletDetails = (account: PaymentAccount) => selectedContactId && handleSendMessage(`💳 *Datos de Pago:*\n${account.bankName} - ${account.accountNumber}`, 'text');
  const handleAddThirdPartyAccount = (account: ThirdPartyAccount) => setSavedAccounts(prev => [...prev, account]);
  
  const handleSaveProduct = () => {
    if (!newProductName || !newProductPrice) return;
    
    const productImages = newProductImages.length > 0 ? newProductImages : undefined;
    const mainImage = productImages?.[0] || 'https://placehold.co/100x100/e2e8f0/64748b?text=' + newProductName.substring(0, 1);
    
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        name: newProductName,
        price: Number(newProductPrice),
        stock: Number(newProductStock) || 0,
        description: newProductDescription,
        image: mainImage,
        images: productImages,
        categoryId: newProductCategory || undefined
      } : p));
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: newProductName,
        price: Number(newProductPrice),
        stock: Number(newProductStock) || 0,
        description: newProductDescription,
        image: mainImage,
        images: productImages,
        categoryId: newProductCategory || undefined
      };
      setProducts(prev => [...prev, newProduct]);
    }
    
    setNewProductName('');
    setNewProductPrice('');
    setNewProductStock('');
    setNewProductDescription('');
    setNewProductImage('');
    setNewProductImages([]);
    setNewProductCategory('');
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Eliminar este producto?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProductName(product.name);
    setNewProductPrice(product.price.toString());
    setNewProductStock(product.stock?.toString() || '');
    setNewProductDescription(product.description);
    setNewProductImage(product.image);
    setNewProductImages(product.images || []);
    setNewProductCategory(product.categoryId || '');
    setCatalogView('products');
  };

  const handleSaveCategory = () => {
    if (!newCategoryName) return;
    
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newCategory: ProductCategory = {
      id: Date.now().toString(),
      name: newCategoryName,
      icon: newCategoryIcon,
      color: randomColor
    };
    
    setCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
    setNewCategoryIcon('fa-box');
    setShowCategoryForm(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('¿Eliminar esta categoría? Los productos no se eliminarán.')) {
      setCategories(prev => prev.filter(c => c.id !== id));
      setProducts(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p));
      if (selectedCategory === id) setSelectedCategory(null);
    }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewProductImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductMultipleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      console.log('Uploading images:', fileArray.length);
      
      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          console.log('Image loaded, size:', result.length);
          setNewProductImages(prev => {
            console.log('Current images:', prev.length);
            return [...prev, result];
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveProductImage = (index: number) => {
    setNewProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newDoc = {
          id: Date.now().toString(),
          name: file.name,
          type: file.name.includes('RUT') || file.name.includes('rut') ? 'RUT' : 
                file.name.includes('camara') || file.name.includes('comercio') ? 'Cámara de Comercio' :
                file.name.includes('cedula') || file.name.includes('cédula') ? 'Cédula' : 'Otro',
          file: event.target?.result as string,
          uploadDate: new Date()
        };
        setDocuments(prev => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor selecciona un archivo PDF');
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('¿Eliminar este documento?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleSaveDocumentDescription = () => {
    if (editingDocument) {
      setDocuments(prev => prev.map(d => 
        d.id === editingDocument.id 
          ? { ...d, description: documentDescription }
          : d
      ));
      setEditingDocument(null);
      setDocumentDescription('');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBusinessLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor selecciona una imagen (PNG, JPG, etc.)');
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDigitalSignature(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor selecciona una imagen PNG');
    }
  };

  const handleSaveSignature = (signature: string) => {
    setDigitalSignature(signature);
    setShowSignaturePad(false);
  };
  
  const handleCreateContact = () => {
      if(newContactName && newProjectName) {
          const newProject: Project = {
              id: Date.now().toString() + '_p',
              name: newProjectName,
              value: 0,
              stage: ProjectStage.Inquiry,
              expenses: [],
              startDate: new Date()
          };

          const newContact: Contact = { 
              id: Date.now().toString(), 
              clientName: newContactName, 
              avatar: `https://ui-avatars.com/api/?name=${newContactName}&background=random`, 
              phone: newContactPhone, 
              status: UserStatus.Lead, 
              role: newContactRole, 
              projects: [newProject], 
              lastMessage: 'Nuevo contacto', 
              lastMessageTime: new Date(), 
              unreadCount: 0 
            };
          setContacts(prev => [newContact, ...prev]);
          setMessages(prev => ({ ...prev, [newContact.id]: [] }));
          setSelectedContactId(newContact.id);
          setShowNewContactModal(false);
          if (pendingDocumentAction) { setChatAction(pendingDocumentAction); setPendingDocumentAction(null); }
      }
  };
  
  const handleDocumentClick = (type: any) => { setPendingDocumentAction(type); setShowClientSelectionModal(true); };
  const handleSelectContactForDocument = (contactId: string) => { setSelectedContactId(contactId); if (pendingDocumentAction) { setChatAction(pendingDocumentAction); setPendingDocumentAction(null); } setShowClientSelectionModal(false); };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const isChatOpen = !!selectedContactId || showFinancials || showStatus;
  const showLeftCol = isChatOpen ? 'hidden md:flex' : (mobileTab === 'chats' ? 'flex' : 'hidden md:flex');
  const showRightCol = isChatOpen ? 'flex' : (mobileTab === 'home' ? 'flex' : 'hidden md:flex');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f1f5f9] relative font-sans text-slate-800"> 
      
      {/* Left Column: Chat List */}
      <div className={`w-full md:w-[30%] md:max-w-[400px] md:min-w-[300px] flex-col border-r border-[#334155] bg-[#1e293b] ${showLeftCol}`}>
        <ChatList 
          contacts={contacts} 
          selectedContactId={selectedContactId} 
          onSelectContact={(id) => { setSelectedContactId(id); setShowFinancials(false); setShowStatus(false); }}
          onOpenFinancials={() => { setShowFinancials(true); setSelectedContactId(null); setShowStatus(false); }}
          onOpenStatus={() => { setShowStatus(true); setSelectedContactId(null); setShowFinancials(false); }}
          onOpenWallet={() => setShowWallet(true)}
          onOpenNotifications={() => { /* setShowNotifications(true); setSelectedContactId(null); setShowFinancials(false); setShowStatus(false); */ }}
        />
      </div>
      
      {/* Right Column: Main Content */}
      <div className={`flex-1 flex flex-col h-full bg-[#f8fafc] ${showRightCol}`}>
        {showStatus ? (
            <StatusView contacts={contacts} myStories={stories.filter(s => s.contactId === 'me')} contactStories={stories.filter(s => s.contactId !== 'me')} onClose={() => setShowStatus(false)} onAddStory={handleAddStory} startInCamera={startCamera} />
        ) : showFinancials ? (
          <div className="flex items-center justify-center h-full bg-slate-100"><p className="text-slate-500">Funcionalidad temporalmente deshabilitada</p></div>
        ) : selectedContactId ? (
          <ChatWindow 
            contact={contacts.find(c => c.id === selectedContactId)!} 
            allContacts={contacts} 
            messages={messages[selectedContactId] || []} 
            onSendMessage={handleSendMessage} 
            onUpdateStage={handleUpdateStage} 
            onUpdateProjectInfo={handleUpdateProjectInfo} 
            products={products}
            paymentAccounts={MOCK_ACCOUNTS}
            onAddExpense={handleAddExpense} 
            onBack={() => setSelectedContactId(null)} 
            activeAction={chatAction} 
            onClearAction={() => setChatAction(null)} 
            onUpdateMessage={handleUpdateMessageMetadata}
            businessLogo={businessLogo}
            digitalSignature={digitalSignature}
          />
        ) : (
          /* DASHBOARD (Modern Clean) */
          <div className="flex-1 bg-[#f1f5f9] flex flex-col items-center justify-center p-4 pb-24 md:pb-4 relative overflow-y-auto">
            {/* Same Dashboard UI */}
            <div className="w-full max-w-5xl flex flex-col items-center z-10">
                {/* Hero Section */}
                <div className="mb-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mx-auto mb-4">
                        <i className="fa-solid fa-layer-group text-4xl"></i>
                    </div>
                    <h1 className="text-slate-900 text-3xl font-bold mb-2 tracking-tight">Worky Pro</h1>
                    <p className="text-slate-500 text-sm">Tu centro de operaciones comercial.</p>
                </div>

                {/* Main Shortcuts */}
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 w-full max-w-4xl px-2">Herramientas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl px-2 mb-10">
                    <button onClick={() => setShowFinancials(true)} className="bg-white hover:bg-slate-50 hover:-translate-y-1 p-6 rounded-2xl transition-all duration-300 group shadow-sm border border-slate-200">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 text-xl"><i className="fa-solid fa-chart-pie"></i></div>
                        <span className="block text-slate-800 font-bold text-sm">Finanzas</span>
                        <span className="block text-slate-400 text-xs mt-1">Ver reportes</span>
                    </button>
                    <button onClick={() => setShowCatalogManager(true)} className="bg-white hover:bg-slate-50 hover:-translate-y-1 p-6 rounded-2xl transition-all duration-300 group shadow-sm border border-slate-200">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-3 text-xl"><i className="fa-solid fa-box-open"></i></div>
                        <span className="block text-slate-800 font-bold text-sm">Catálogo</span>
                        <span className="block text-slate-400 text-xs mt-1">Productos</span>
                    </button>
                    <button onClick={() => setShowWallet(true)} className="bg-white hover:bg-slate-50 hover:-translate-y-1 p-6 rounded-2xl transition-all duration-300 group shadow-sm border border-slate-200">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3 text-xl"><i className="fa-solid fa-wallet"></i></div>
                        <span className="block text-slate-800 font-bold text-sm">Billetera</span>
                        <span className="block text-slate-400 text-xs mt-1">Cuentas y bancos</span>
                    </button>
                    <button onClick={() => { setShowStatus(true); setStartCamera(false); }} className="bg-white hover:bg-slate-50 hover:-translate-y-1 p-6 rounded-2xl transition-all duration-300 group shadow-sm border border-slate-200">
                        <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 mb-3 text-xl"><i className="fa-solid fa-circle-notch"></i></div>
                        <span className="block text-slate-800 font-bold text-sm">Historias</span>
                        <span className="block text-slate-400 text-xs mt-1">Marketing</span>
                    </button>
                    <button onClick={() => { setShowStatus(true); setStartCamera(true); }} className="bg-white hover:bg-slate-50 hover:-translate-y-1 p-6 rounded-2xl transition-all duration-300 group shadow-sm border border-slate-200">
                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 mb-3 text-xl"><i className="fa-solid fa-camera"></i></div>
                        <span className="block text-slate-800 font-bold text-sm">Cámara</span>
                        <span className="block text-slate-400 text-xs mt-1">Crear contenido</span>
                    </button>
                </div>

                {/* New Contact CTA */}
                <button 
                    onClick={() => setShowNewContactModal(true)}
                    className="w-full max-w-md bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-3 mb-12 shadow-lg shadow-indigo-200 active:scale-95"
                >
                    <i className="fa-solid fa-plus text-sm"></i>
                    <span className="text-lg tracking-wide">Nuevo contacto</span>
                </button>

                {/* Document Actions */}
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 w-full max-w-4xl px-2">Gestión Documental</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl px-2">
                    {[
                        { label: 'Cotización', icon: 'fa-file-contract', color: 'text-teal-500 bg-teal-50 border-teal-100', action: 'quote' },
                        { label: 'Cuenta Cobro', icon: 'fa-file-invoice', color: 'text-orange-500 bg-orange-50 border-orange-100', action: 'collection_account' },
                        { label: 'Factura', icon: 'fa-file-invoice-dollar', color: 'text-indigo-500 bg-indigo-50 border-indigo-100', action: 'invoice' },
                        { label: 'Registrar Gasto', icon: 'fa-circle-minus', color: 'text-rose-500 bg-rose-50 border-rose-100', action: 'expense' },
                    ].map((btn, i) => (
                        <button key={i} onClick={() => handleDocumentClick(btn.action)} className={`bg-white p-4 rounded-xl flex flex-row md:flex-col items-center gap-4 md:gap-3 hover:bg-slate-50 transition border border-slate-200 shadow-sm group hover:shadow-md`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${btn.color} border`}>
                                <i className={`fa-solid ${btn.icon} text-lg`}></i>
                            </div>
                            <span className="text-slate-700 text-sm font-bold group-hover:text-slate-900">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-16 text-slate-400 text-xs flex items-center gap-2">
              <i className="fa-solid fa-lock text-[10px]"></i> Conexión segura cifrada.
            </div>
          </div>
        )}
      </div>

      {/* MOBILE NAV (Light) */}
      {!isChatOpen && (
          <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 shadow-lg">
             <button onClick={() => setMobileTab('home')} className={`flex flex-col items-center gap-1 ${mobileTab === 'home' ? 'text-indigo-600' : 'text-slate-400'}`}>
                <i className="fa-solid fa-house text-xl"></i>
                <span className="text-[10px] font-bold">Inicio</span>
             </button>
             <button onClick={() => setShowDocuments(true)} className="flex flex-col items-center gap-1 text-slate-400">
                <i className="fa-solid fa-folder-open text-xl"></i>
                <span className="text-[10px] font-bold">Documentos</span>
             </button>
             <button onClick={() => setMobileTab('chats')} className={`flex flex-col items-center gap-1 ${mobileTab === 'chats' ? 'text-indigo-600' : 'text-slate-400'}`}>
                <i className="fa-solid fa-comment-dots text-xl"></i>
                <span className="text-[10px] font-bold">Chats</span>
             </button>
          </div>
      )}

      {/* MODALS (Client Selection, New Contact, etc) - Modern Light */}
      {showClientSelectionModal && (
          <div className="absolute inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-slate-800 font-bold">Seleccionar Cliente</h3>
                    <button onClick={() => { setShowClientSelectionModal(false); }} className="text-slate-400 hover:text-slate-800"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="p-4">
                    <button onClick={() => { setShowClientSelectionModal(false); setShowNewContactModal(true); }} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold mb-4 hover:bg-indigo-700 transition">
                        <i className="fa-solid fa-user-plus mr-2"></i> Nuevo contacto
                    </button>
                    <div className="text-slate-400 text-xs font-bold uppercase mb-2">Recientes</div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                        {contacts.map(c => (
                            <div key={c.id} onClick={() => handleSelectContactForDocument(c.id)} className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-3 transition border border-transparent hover:border-slate-200">
                                <img src={c.avatar} className="w-8 h-8 rounded-full shadow-sm" />
                                <div className="text-sm font-bold text-slate-700">{c.clientName}</div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>
      )}

      {showNewContactModal && (
          <div className="absolute inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                <button onClick={() => setShowNewContactModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><i className="fa-solid fa-xmark"></i></button>
                <h3 className="text-slate-800 font-bold text-xl mb-6">Nuevo Contacto</h3>
                <div className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {['client', 'supplier', 'collaborator'].map(role => (
                            <button key={role} onClick={() => setNewContactRole(role as any)} className={`flex-1 py-2 text-xs font-bold rounded capitalize transition ${newContactRole === role ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {role === 'client' ? 'Cliente' : role === 'supplier' ? 'Proveedor' : 'Colaborador'}
                            </button>
                        ))}
                    </div>
                    <input type="text" placeholder="Nombre" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="w-full bg-slate-50 text-slate-800 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    <input type="text" placeholder="Primer Proyecto / Empresa" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="w-full bg-slate-50 text-slate-800 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    <input type="tel" placeholder="Teléfono" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="w-full bg-slate-50 text-slate-800 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <button onClick={handleCreateContact} disabled={!newContactName} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold mt-6 hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-200">Guardar</button>
             </div>
          </div>
      )}

      {showWallet && <WalletModal accounts={MOCK_ACCOUNTS} savedAccounts={savedAccounts} onClose={() => setShowWallet(false)} onSendDetails={selectedContactId ? handleSendWalletDetails : undefined} onAddThirdParty={handleAddThirdPartyAccount} />}
      
      {showSignaturePad && (
        <SignaturePad
          onSave={handleSaveSignature}
          onClose={() => setShowSignaturePad(false)}
          currentSignature={digitalSignature}
        />
      )}

      {/* Catalog Manager Modal */}
      {showCatalogManager && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <i className="fa-solid fa-box-open text-white text-xl"></i>
                </div>
                <h2 className="text-white text-xl font-bold">Gestión de Catálogo</h2>
              </div>
              <button onClick={() => { setShowCatalogManager(false); setCatalogView('folders'); setSelectedCategory(null); setEditingProduct(null); setNewProductName(''); setNewProductPrice(''); setNewProductStock(''); setNewProductDescription(''); setNewProductImage(''); setNewProductImages([]); setNewProductCategory(''); }} className="text-white/80 hover:text-white text-2xl">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* View Toggle - Only show when in products view */}
              {catalogView === 'products' && (
                <button
                  onClick={() => { setCatalogView('folders'); setShowProductForm(false); setEditingProduct(null); setNewProductName(''); setNewProductPrice(''); setNewProductStock(''); setNewProductDescription(''); setNewProductImage(''); setNewProductImages([]); }}
                  className="mb-4 text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  Volver a Carpetas
                </button>
              )}

              {catalogView === 'folders' ? (
                <>
                  {/* Categories Management */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <i className="fa-solid fa-folder-open text-amber-500"></i>
                        Carpetas de Productos
                      </h3>
                      <button
                        onClick={() => setShowCategoryForm(!showCategoryForm)}
                        className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-2"
                      >
                        <i className="fa-solid fa-plus"></i>
                        Nueva Carpeta
                      </button>
                    </div>
                    
                    {showCategoryForm && (
                      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <input
                            type="text"
                            placeholder="Nombre de la carpeta"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="bg-white p-3 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                          />
                          <button
                            onClick={handleSaveCategory}
                            disabled={!newCategoryName.trim()}
                            className="bg-purple-600 text-white px-6 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                          >
                            <i className="fa-solid fa-check mr-2"></i>
                            Crear
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Folder Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {categories.map(category => {
                        const categoryProducts = products.filter(p => p.categoryId === category.id);
                        const previewImages = categoryProducts.slice(0, 4).map(p => p.image);
                        
                        return (
                          <div
                            key={category.id}
                            className="relative bg-white rounded-xl border-2 border-slate-200 overflow-hidden hover:shadow-lg transition cursor-pointer group"
                            onClick={() => { setSelectedCategory(category.id); setNewProductCategory(category.id); setCatalogView('products'); }}
                          >
                            {/* Preview Images Grid */}
                            <div className="aspect-square bg-slate-100 grid grid-cols-2 gap-0.5 p-0.5">
                              {previewImages.length > 0 ? (
                                previewImages.map((img, idx) => (
                                  <div key={idx} className="bg-slate-200 rounded overflow-hidden">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-2 flex items-center justify-center text-slate-400">
                                  <i className={`${category.icon} text-4xl`}></i>
                                </div>
                              )}
                              {previewImages.length > 0 && previewImages.length < 4 && (
                                Array.from({ length: 4 - previewImages.length }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="bg-slate-100 rounded"></div>
                                ))
                              )}
                            </div>
                            
                            {/* Folder Info */}
                            <div 
                              className="p-3"
                              style={{ backgroundColor: category.color + '15' }}
                            >
                              <h4 className="font-bold text-slate-800 text-sm truncate flex items-center gap-2">
                                <i className={`${category.icon}`} style={{ color: category.color }}></i>
                                {category.name}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {categoryProducts.length} producto{categoryProducts.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            
                            {/* Add Product Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategory(category.id);
                                setNewProductCategory(category.id);
                                setCatalogView('products');
                                setShowProductForm(true);
                              }}
                              className="absolute top-2 right-2 w-8 h-8 bg-purple-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-purple-700"
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                            
                            {/* Delete Folder Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category.id);
                              }}
                              className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-red-600"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
              {/* Add/Edit Product Form */}
              {showProductForm && (
              <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <i className="fa-solid fa-plus-circle text-purple-500"></i>
                    {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                      setNewProductName('');
                      setNewProductPrice('');
                      setNewProductStock('');
                      setNewProductDescription('');
                      setNewProductImage('');
                      setNewProductImages([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xl"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <input 
                    type="text" 
                    placeholder="Nombre del producto" 
                    value={newProductName}
                    onChange={e => setNewProductName(e.target.value)}
                    className="bg-white p-3 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                  <input 
                    type="number" 
                    placeholder="Precio" 
                    value={newProductPrice}
                    onChange={e => setNewProductPrice(e.target.value)}
                    className="bg-white p-3 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <input 
                    type="number" 
                    placeholder="Stock disponible" 
                    value={newProductStock}
                    onChange={e => setNewProductStock(e.target.value)}
                    className="bg-white p-3 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                  <div className="relative">
                    <select
                      value={newProductCategory}
                      onChange={e => setNewProductCategory(e.target.value)}
                      className="bg-white p-3 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none w-full"
                      style={newProductCategory ? {
                        backgroundColor: categories.find(c => c.id === newProductCategory)?.color + '20',
                        borderColor: categories.find(c => c.id === newProductCategory)?.color,
                        fontWeight: '600'
                      } : {}}
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {newProductCategory && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <i 
                          className={`${categories.find(c => c.id === newProductCategory)?.icon} mr-2`}
                          style={{ color: categories.find(c => c.id === newProductCategory)?.color }}
                        ></i>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <textarea 
                    placeholder="Descripción" 
                    value={newProductDescription}
                    onChange={e => setNewProductDescription(e.target.value)}
                    className="w-full bg-white p-3 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none resize-none"
                    rows={2}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Imágenes del Producto
                    <span className="text-xs text-slate-400 ml-2">(Puedes subir múltiples fotos)</span>
                    {newProductImages.length > 0 && (
                      <span className="ml-2 text-xs font-bold text-purple-600">
                        {newProductImages.length} {newProductImages.length === 1 ? 'imagen' : 'imágenes'} cargada{newProductImages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.capture = 'environment' as any;
                        input.multiple = true;
                        input.onchange = handleProductMultipleImagesUpload as any;
                        input.click();
                      }}
                      className="flex-1 bg-purple-50 text-purple-600 py-2 px-4 rounded-lg border border-purple-200 font-semibold hover:bg-purple-100 transition"
                    >
                      <i className="fa-solid fa-camera mr-2"></i> Cámara
                    </button>
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.multiple = true;
                        input.onchange = handleProductMultipleImagesUpload as any;
                        input.click();
                      }}
                      className="flex-1 bg-pink-50 text-pink-600 py-2 px-4 rounded-lg border border-pink-200 font-semibold hover:bg-pink-100 transition"
                    >
                      <i className="fa-solid fa-image mr-2"></i> Galería
                    </button>
                  </div>
                  
                  {/* Preview de imágenes */}
                  <div className="mt-3">
                    {newProductImages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {newProductImages.map((img, idx) => (
                          <div key={idx} className="relative inline-block group">
                            <img 
                              src={img} 
                              alt={`Preview ${idx + 1}`}
                              onClick={() => { setViewingImage(img); setViewingImageIndex(idx); }}
                              className="w-24 h-24 rounded-lg object-cover border-2 border-slate-200 cursor-pointer hover:border-purple-500 transition" 
                            />
                            <div 
                              onClick={() => { setViewingImage(img); setViewingImageIndex(idx); }}
                              className="absolute inset-0 bg-black/0 hover:bg-black/20 rounded-lg transition cursor-pointer flex items-center justify-center"
                            >
                              <i className="fa-solid fa-search-plus text-white text-2xl opacity-0 group-hover:opacity-100 transition"></i>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRemoveProductImage(idx); }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 z-10"
                            >
                              <i className="fa-solid fa-times"></i>
                            </button>
                            {idx === 0 && (
                              <div className="absolute bottom-1 left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                Principal
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <i className="fa-solid fa-images text-slate-300 text-3xl mb-2"></i>
                        <p className="text-xs text-slate-400">No hay imágenes cargadas</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={handleSaveProduct}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition shadow-lg"
                >
                  <i className="fa-solid fa-save mr-2"></i>
                  {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                </button>
                
                {editingProduct && (
                  <button 
                    onClick={() => { setEditingProduct(null); setNewProductName(''); setNewProductPrice(''); setNewProductStock(''); setNewProductDescription(''); setNewProductImage(''); setNewProductImages([]); setShowProductForm(false); }}
                    className="w-full bg-slate-200 text-slate-600 py-2 rounded-lg font-semibold hover:bg-slate-300 transition mt-2"
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
              )}
              
              {/* Products Gallery */}
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-images text-purple-500"></i>
                {selectedCategory 
                  ? `${categories.find(c => c.id === selectedCategory)?.name} (${products.filter(p => p.categoryId === selectedCategory).length})`
                  : `Productos en Catálogo (${products.length})`
                }
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* Add Product Button */}
                <button
                  onClick={() => { setShowProductForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="aspect-square bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-500 hover:from-purple-100 hover:to-pink-100 transition flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-500 group-hover:bg-purple-600 transition flex items-center justify-center">
                    <i className="fa-solid fa-plus text-white text-2xl"></i>
                  </div>
                  <span className="text-sm font-semibold text-purple-600 group-hover:text-purple-700">Nuevo Producto</span>
                </button>

                {/* Products */}
                {products
                  .filter(p => selectedCategory === null || p.categoryId === selectedCategory)
                  .map(product => (
                  <div 
                    key={product.id} 
                    className="aspect-square bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition group relative cursor-pointer"
                    onClick={() => {
                      setViewingProduct(product);
                      if (product.images && product.images.length > 0) {
                        setViewingImage(product.images[0]);
                        setViewingImageIndex(0);
                      } else {
                        setViewingImage(product.image);
                        setViewingImageIndex(0);
                      }
                    }}
                  >
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
                      <h4 className="font-bold text-white text-sm mb-1 truncate">{product.name}</h4>
                      <div className="text-white font-bold text-xs">${product.price.toLocaleString()}</div>
                      {product.stock !== undefined && (
                        <div className="text-white/80 text-xs mt-1">Stock: {product.stock}</div>
                      )}
                      {product.images && product.images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                          <i className="fa-solid fa-images mr-1"></i>
                          {product.images.length}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditProduct(product); setShowProductForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="w-8 h-8 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition flex items-center justify-center shadow-lg"
                      >
                        <i className="fa-solid fa-edit text-xs"></i>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                        className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition flex items-center justify-center shadow-lg"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {products.filter(p => selectedCategory === null || p.categoryId === selectedCategory).length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <i className="fa-solid fa-box-open text-6xl mb-4 opacity-20"></i>
                  <p className="font-semibold">No hay productos en esta categoría</p>
                  <p className="text-sm">Agrega tu primer producto arriba</p>
                </div>
              )}
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setViewingImage(null); setViewingProduct(null); }}
        >
          <button
            onClick={() => { setViewingImage(null); setViewingProduct(null); }}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl transition z-10"
          >
            <i className="fa-solid fa-times"></i>
          </button>
          
          {/* Navigation for product images or form images */}
          {((viewingProduct?.images && viewingProduct.images.length > 1) || newProductImages.length > 1) && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const images = viewingProduct?.images || newProductImages;
                  const newIndex = viewingImageIndex > 0 ? viewingImageIndex - 1 : images.length - 1;
                  setViewingImageIndex(newIndex);
                  setViewingImage(images[newIndex]);
                }}
                className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl transition z-10"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const images = viewingProduct?.images || newProductImages;
                  const newIndex = viewingImageIndex < images.length - 1 ? viewingImageIndex + 1 : 0;
                  setViewingImageIndex(newIndex);
                  setViewingImage(images[newIndex]);
                }}
                className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl transition z-10"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </>
          )}
          
          <div className="max-w-5xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img 
              src={viewingImage} 
              alt="Vista completa"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            
            {/* Image counter and product info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
              {((viewingProduct?.images && viewingProduct.images.length > 1) || newProductImages.length > 1) && (
                <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {viewingImageIndex + 1} / {(viewingProduct?.images || newProductImages).length}
                </div>
              )}
              {viewingProduct && (
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-center">
                  <div className="font-bold">{viewingProduct.name}</div>
                  <div className="text-sm text-purple-300">${viewingProduct.price.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents Manager Modal */}
      {showDocuments && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <i className="fa-solid fa-folder-open text-white text-xl"></i>
                </div>
                <h2 className="text-white text-xl font-bold">Mis Documentos</h2>
              </div>
              <button onClick={() => setShowDocuments(false)} className="text-white/80 hover:text-white text-2xl">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Logo Upload Section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-200">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {businessLogo ? (
                      <div className="w-24 h-24 rounded-lg border-2 border-purple-300 bg-white p-2 flex items-center justify-center overflow-hidden">
                        <img src={businessLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-purple-300 bg-white flex items-center justify-center">
                        <i className="fa-solid fa-image text-purple-300 text-3xl"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1">Logo de tu Negocio</h3>
                    <p className="text-sm text-slate-600 mb-3">Este logo aparecerá en tus cotizaciones, facturas y cuentas de cobro</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = handleLogoUpload as any;
                          input.click();
                        }}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                      >
                        <i className="fa-solid fa-upload"></i>
                        {businessLogo ? 'Cambiar Logo' : 'Subir Logo'}
                      </button>
                      {businessLogo && (
                        <button
                          onClick={() => setBusinessLogo('')}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                          <i className="fa-solid fa-trash"></i>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-indigo-200">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {digitalSignature ? (
                      <div className="w-32 h-20 rounded-lg border-2 border-indigo-300 bg-white p-2 flex items-center justify-center overflow-hidden">
                        <img src={digitalSignature} alt="Firma" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-32 h-20 rounded-lg border-2 border-dashed border-indigo-300 bg-white flex items-center justify-center">
                        <i className="fa-solid fa-signature text-indigo-300 text-2xl"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1">Firma Digital</h3>
                    <p className="text-sm text-slate-600 mb-3">Tu firma aparecerá en facturas, cuentas de cobro y cotizaciones</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setShowSignaturePad(true)}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                      >
                        <i className="fa-solid fa-pen"></i>
                        {digitalSignature ? 'Dibujar Nueva' : 'Dibujar Firma'}
                      </button>
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/png,image/jpeg';
                          input.onchange = handleSignatureUpload as any;
                          input.click();
                        }}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                      >
                        <i className="fa-solid fa-upload"></i>
                        {digitalSignature ? 'Subir Otra' : 'Subir Firma'}
                      </button>
                      {digitalSignature && (
                        <button
                          onClick={() => setDigitalSignature('')}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                          <i className="fa-solid fa-trash"></i>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'application/pdf';
                  input.onchange = handleDocumentUpload as any;
                  input.click();
                }}
                className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-xl p-8 hover:border-blue-500 hover:from-blue-100 hover:to-indigo-100 transition mb-6 group"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-blue-500 group-hover:bg-blue-600 transition flex items-center justify-center">
                    <i className="fa-solid fa-upload text-white text-2xl"></i>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-800 text-lg">Subir Documento PDF</p>
                    <p className="text-sm text-slate-500 mt-1">RUT, Cámara de Comercio, Cédula, etc.</p>
                  </div>
                </div>
              </button>

              {/* Documents List */}
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <i className="fa-solid fa-file-pdf text-6xl mb-4 opacity-20"></i>
                    <p className="font-semibold">No hay documentos guardados</p>
                    <p className="text-sm mt-1">Sube tu primer documento PDF</p>
                  </div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:shadow-md transition">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                          <i className="fa-solid fa-file-pdf text-white text-xl"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">{doc.name}</h4>
                          <div className="flex items-center gap-3 mt-1 mb-2">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{doc.type}</span>
                            <span className="text-xs text-slate-500">
                              {doc.uploadDate.toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          
                          {/* Description */}
                          {editingDocument?.id === doc.id ? (
                            <div className="mt-2">
                              <textarea
                                value={documentDescription}
                                onChange={e => setDocumentDescription(e.target.value)}
                                placeholder="Agrega una descripción..."
                                className="w-full bg-white p-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none"
                                rows={2}
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={handleSaveDocumentDescription}
                                  className="flex-1 bg-blue-500 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 transition"
                                >
                                  <i className="fa-solid fa-check mr-1"></i>
                                  Guardar
                                </button>
                                <button
                                  onClick={() => { setEditingDocument(null); setDocumentDescription(''); }}
                                  className="flex-1 bg-slate-300 text-slate-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-400 transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {doc.description ? (
                                <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border border-slate-200">
                                  {doc.description}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400 italic mt-1">Sin descripción</p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingDocument(doc);
                              setDocumentDescription(doc.description || '');
                            }}
                            className="w-10 h-10 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center justify-center"
                            title="Editar descripción"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            onClick={() => {
                              const newWindow = window.open();
                              if (newWindow) {
                                newWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>${doc.name}</title>
                                      <style>
                                        body { margin: 0; padding: 0; }
                                        iframe { width: 100vw; height: 100vh; border: none; }
                                      </style>
                                    </head>
                                    <body>
                                      <iframe src="${doc.file}" type="application/pdf"></iframe>
                                    </body>
                                  </html>
                                `);
                                newWindow.document.close();
                              }
                            }}
                            className="w-10 h-10 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center"
                            title="Ver documento"
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          <a
                            href={doc.file}
                            download={doc.name}
                            className="w-10 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                            title="Descargar"
                          >
                            <i className="fa-solid fa-download"></i>
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="w-10 h-10 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center"
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
