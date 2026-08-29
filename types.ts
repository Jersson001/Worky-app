
export enum UserStatus {
  Lead = 'Lead',
  Client = 'Cliente Activo',
  Completed = 'Finalizado',
  Archived = 'Archivado'
}

export enum ProjectStage {
  Inquiry = 'Consulta',
  Proposal = 'Propuesta',
  InProgress = 'En Progreso',
  Invoicing = 'Facturación',
  Done = 'Completado'
}

export type ContactRole = 'client' | 'supplier' | 'collaborator';

export interface UserProfileData {
  businessName: string;
  ownerName: string;
  phone: string;
  businessType: string;
  businessLogo?: string;
  profilePhoto?: string;
  username: string;
  password: string;
  email?: string;
  nit?: string;
  address?: string;
  city?: string;
  country?: string;
  isPro?: boolean;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  isAdmin?: boolean;
}

export interface PaymentAccount {
  id: string;
  bankName: 'Bancolombia' | 'Nequi' | 'Daviplata' | 'Efectivo';
  accountType: 'Ahorros' | 'Corriente' | 'Celular';
  accountNumber: string;
  holderName: string;
  color: string;
  iconClass: string;
}

export interface ThirdPartyAccount {
  id: string;
  alias: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  holderName: string;
  documentId?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: string[]; // Multiple images for product
  description: string;
  stock?: number;
  categoryId?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  coverImage?: string; // Imagen de portada para la carpeta
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: 'material' | 'labor' | 'other';
  projectId?: string; // Link to specific project
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  id: string;
  number: string;
  clientName: string;
  items: InvoiceItem[];
  total: number;
  date: Date;
  status: 'Pending' | 'Paid';
}

export interface ReceiptData {
  id: string;
  number: string;
  amount: number;
  concept: string;
  date: Date;
  paymentMethod: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  price: number;
  image?: string; // Mantener para compatibilidad hacia atrás
  images?: string[]; // Nuevo: array de imágenes
}

export interface QuoteData {
  id: string;
  number: string;
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  items: QuoteItem[];
  total: number;
  subtotal?: number;
  taxType?: 'none' | 'percentage' | 'aiu';
  taxPercentage?: number;
  taxAmount?: number;
  aiuAdmin?: number;
  aiuImprevistos?: number;
  aiuUtilidad?: number;
  aiuIva?: number;
  validUntil: Date;
  mode?: QuoteMode;
  sections?: CarpentrySection[];
}

// ─── Cotización personalizada (carpintería) ─────────────────────────────────

export type QuoteMode = 'basica' | 'personalizada';

/**
 * ML, M2 y M3 se multiplican por la medida; el resto vale 1.
 * No mirar esto a ojo: usar `usaMedida()` de utils/carpentryCalculations.
 *
 * PUNTO y VIAJE se comportan igual que UND, pero salen escritos así en el
 * documento del cliente: «12 PUNTOS» se entiende y «12 UND» no.
 */
export type CarpentryUnit = 'ML' | 'M2' | 'M3' | 'UND' | 'PUNTO' | 'VIAJE' | 'GLOBAL';

/** A qué oficio pertenece una categoría. Agrupa el selector de la cotización. */
export type GremioKey = 'carpinteria' | 'obra_civil';

export type CarpentryCategoryKey =
  // Carpintería
  | 'cocinas_integrales'
  | 'closets'
  | 'puertas'
  | 'gabinetes_bano'
  | 'centros_entretenimiento'
  | 'muebles_especiales'
  // Obra blanca y remodelación
  | 'pintura_estuco'
  | 'enchapes'
  | 'drywall'
  | 'puntos_instalaciones'
  | 'demoliciones'
  | 'impermeabilizacion'
  | 'aparatos_materiales';

/**
 * El material que lleva una línea de mano de obra.
 *
 * Va dentro del ítem y no como línea aparte porque el material se cotiza
 * *contra* un trabajo: los 80 m² de pintura son los mismos 80 m² de muro que se
 * van a pintar. Colgarlo del ítem es lo que permite sugerir la medida y ver de
 * un vistazo qué material lleva cada trabajo.
 *
 * Nace apagado: muchos maestros cobran solo la mano de obra y el material lo
 * pone el cliente.
 */
export interface CarpentryMaterial {
  activo: boolean;
  /** Qué material es: «Vinilo Tipo 1», «Porcelanato 60x60». Opcional. */
  descripcion?: string;
  measure?: number;
  quantity?: number;
  unitCost?: number;
}

export interface CarpentryLineItem {
  id: string;
  description: string;
  unit: CarpentryUnit;
  material?: CarpentryMaterial;
  measure?: number; // ML o M2 (para M2 se deriva de width*height en la UI)
  width?: number;   // solo unit === 'M2'
  height?: number;  // solo unit === 'M2'
  unitCost: number;
  quantity: number;
  /** true = costo es valor de ejemplo/plantilla; el usuario aún no lo ha editado */
  isTemplate?: boolean;
  images?: string[];
  comments?: string;
}

export interface CarpentryItemGroup {
  id: string;
  label: string;
  items: CarpentryLineItem[];
}

export interface CarpentrySection {
  id: string;
  category: CarpentryCategoryKey;
  name: string;
  groups: CarpentryItemGroup[];
}

export interface CollectionAccountData {
  id: string;
  number: string;
  amount: number;
  concept: string;
  directedTo: string;
  nit?: string;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  holderName?: string;
  date: Date;
}

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'invoice' | 'product' | 'receipt' | 'quote' | 'collection_account' | 'payment_info' | 'expense' | 'expense_receipt';
  metadata?: any;
  isPaid?: boolean;
  paidDate?: Date;
  mediaUrl?: string;
  mediaType?: string;
  status?: 'sent' | 'delivered' | 'read'; // Estado del mensaje
}

export interface FileMetadata {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl?: string;
}

export interface Story {
  id: string;
  contactId: string; // 'me' or contact ID
  content: string; // Text, Image URL, or Video URL (base64)
  type: 'text' | 'image' | 'video';
  timestamp: Date;
  expiresAt: Date;
  color?: string; // Background color for text stories
  caption?: string;
}

// Fases del proyecto para el diagrama de Gantt
export enum ProjectPhaseType {
  Planning = 'Planificación',
  Design = 'Diseño',
  MaterialPurchase = 'Compra de Materiales',
  Manufacturing = 'Manufactura',
  QualityControl = 'Control de Calidad',
  Delivery = 'Entrega',
  Installation = 'Instalación',
  FinalReview = 'Revisión Final',
  Warranty = 'Garantía'
}

export interface PhaseReminder {
  id: string;
  enabled: boolean;
  type: 'before-end' | 'before-start'; // Antes del fin o antes del inicio de la fase
  amount: number; // Cantidad de tiempo
  unit: 'hours' | 'days'; // Unidad de tiempo
  notified?: boolean; // Si ya se notificó
  notifiedAt?: Date; // Cuándo se notificó
}

export interface ProjectPhase {
  id: string;
  type: ProjectPhaseType;
  name: string; // Nombre personalizado opcional
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  notes?: string;
  responsible?: string;
  dependencies?: string[]; // IDs de fases que deben completarse antes
  color?: string;
  reminders?: PhaseReminder[]; // Recordatorios configurables
}

export interface Project {
  id: string;
  name: string;
  value: number;
  stage: ProjectStage;
  expenses: Expense[];
  startDate: Date;
  endDate?: Date; // Fecha estimada de finalización
  phases?: ProjectPhase[]; // Fases para el Gantt
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface Contact {
  id: string;
  clientName: string;
  alias?: string;
  avatar: string;
  phone: string;
  /**
   * Correo del cliente. Es lo que identifica a un usuario en Worky: el registro
   * es por correo y `public_info` guarda eso, así que es lo único con lo que se
   * puede reconocer a un contacto manual cuando resulta que ya tiene cuenta.
   */
  email?: string;
  status: UserStatus;
  role: ContactRole;
  projects: Project[]; // Array of projects per client
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  notes?: string;
}

// Tipos de grupo
export type GroupType = 'general' | 'project' | 'subgroup';

// Roles dentro de un grupo
export type GroupMemberRole = 'admin' | 'member' | 'viewer';

// Miembro de un grupo
export interface GroupMember {
  id: string;
  contactId: string;
  role: GroupMemberRole;
  joinedAt: Date;
  addedBy?: string;
}

// Subgrupo (ej: carpinteros, plomeros, etc.)
export interface SubGroup {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  members: GroupMember[];
  createdAt: Date;
  parentGroupId: string; // ID del grupo padre
}

// Grupo principal
export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  type: GroupType;
  projectId?: string; // Si es un grupo de proyecto
  members: GroupMember[];
  subGroups?: SubGroup[];
  createdAt: Date;
  createdBy: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  settings?: {
    onlyAdminsCanPost?: boolean;
    onlyAdminsCanAddMembers?: boolean;
    muteNotifications?: boolean;
  };
}

// Mensaje de grupo (extiende Message)
export interface GroupMessage {
  id: string;
  groupId: string;
  subGroupId?: string; // Si el mensaje es en un subgrupo
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: any;
  readBy?: string[]; // IDs de miembros que lo han leído
  replyTo?: string; // ID del mensaje al que responde
}

export enum AppView {
  Chat = 'Chat',
  Projects = 'Projects',
  Invoices = 'Invoices',
  Settings = 'Settings'
}
