export type Collection = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  bgColor: string;
  textColor: string;
};

export const COLLECTIONS: Collection[] = [
  { id: 'ensaladas', label: 'Para Ensaladas', emoji: '🥗', description: 'Frescas y crujientes', bgColor: '#F0FDF4', textColor: '#166534' },
  { id: 'smoothies', label: 'Smoothies', emoji: '🧃', description: 'Perfectas para licuar', bgColor: '#FFF7ED', textColor: '#9A3412' },
  { id: 'detox', label: 'Detox', emoji: '🌿', description: 'Limpia y revitaliza', bgColor: '#F0FDFA', textColor: '#134E4A' },
  { id: 'energia', label: 'Energía Natural', emoji: '⚡', description: 'Carga tu día', bgColor: '#FEFCE8', textColor: '#713F12' },
  { id: 'inmuno', label: 'Inmuno Power', emoji: '🛡️', description: 'Refuerza tus defensas', bgColor: '#FDF4FF', textColor: '#701A75' },
];
