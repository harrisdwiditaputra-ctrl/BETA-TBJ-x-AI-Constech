import { WorkItemMaster } from "@/types";

export const WORK_ITEMS_MASTER: WorkItemMaster[] = [
  // PEKERJAAN PERSIAPAN
  { id: "P001", category: "Persiapan", name: "Pembersihan Lapangan dan Perataan", unit: "m2", price: 15000 },
  { id: "P002", category: "Persiapan", name: "Pasang Bouwplank", unit: "m1", price: 45000 },
  { id: "P003", category: "Persiapan", name: "Direksi Keet / Gudang Sementara", unit: "m2", price: 750000 },
  { id: "P004", category: "Persiapan", name: "Pagar Proyek Seng Gelombang t=2m", unit: "m1", price: 225000 },

  // GALIAN & URUGAN
  { id: "G001", category: "Galian", name: "Galian Tanah Pondasi (kedalaman < 1m)", unit: "m3", price: 75000 },
  { id: "G002", category: "Galian", name: "Galian Tanah Pondasi (kedalaman 1-2m)", unit: "m3", price: 95000 },
  { id: "G003", category: "Galian", name: "Urugan Pasir Bawah Pondasi", unit: "m3", price: 220000 },
  { id: "G004", category: "Galian", name: "Urugan Tanah Kembali", unit: "m3", price: 35000 },
  { id: "G005", category: "Galian", name: "Urugan Tanah Peninggian Lantai (Sirtu)", unit: "m3", price: 185000 },
  { id: "G006", category: "Galian", name: "Urugan Tanah Merah / Tanah Taman", unit: "m3", price: 250000 },
  { id: "G007", category: "Galian", name: "Pemadatan Tanah per 20cm (Stamper)", unit: "m2", price: 12000 },
  { id: "G008", category: "Galian", name: "Screed Lantai t=3cm", unit: "m2", price: 55000 },
  { id: "G009", category: "Galian", name: "Screed Lantai t=5cm", unit: "m2", price: 75000 },

  // PONDASI & BETON
  { id: "B001", category: "Pondasi", name: "Pasangan Pondasi Batu Kali (1:4)", unit: "m3", price: 950000 },
  { id: "B002", category: "Beton", name: "Beton Sloof 15/20 (K-175)", unit: "m3", price: 3800000 },
  { id: "B003", category: "Beton", name: "Beton Kolom Praktis 15/15", unit: "m1", price: 125000 },
  { id: "B004", category: "Beton", name: "Beton Ring Balok 15/20", unit: "m1", price: 145000 },
  { id: "B005", category: "Beton", name: "Cor Lantai Kerja (1:3:5)", unit: "m3", price: 1100000 },
  { id: "B006", category: "Beton", name: "Beton Struktur K-250 (Ready Mix)", unit: "m3", price: 1250000 },
  { id: "B007", category: "Beton", name: "Beton Struktur K-300 (Ready Mix)", unit: "m3", price: 1350000 },
  { id: "B008", category: "Beton", name: "Pasang Bondek t=0.75mm", unit: "m2", price: 185000 },
  { id: "B009", category: "Beton", name: "Pasang Wiremesh M8 (1 Lapis)", unit: "m2", price: 95000 },
  { id: "B010", category: "Beton", name: "Cor Plat Lantai t=12cm (K-250)", unit: "m2", price: 225000 },
  { id: "B011", category: "Beton", name: "Kanopi Beton Minimalis (Cor di Tempat)", unit: "m1", price: 850000 },
  { id: "B012", category: "Beton", name: "Profile Beton t=2cm", unit: "m1", price: 45000 },
  { id: "B013", category: "Beton", name: "Profile Beton t=5cm", unit: "m1", price: 85000 },

  // PEMBESIAN
  { id: "RE001", category: "Pembesian", name: "Pembesian Kolom Utama 40x40 (Besi D16)", unit: "m1", price: 450000 },
  { id: "RE002", category: "Pembesian", name: "Pembesian Kolom Utama 30x30 (Besi D13)", unit: "m1", price: 325000 },
  { id: "RE003", category: "Pembesian", name: "Pembesian Kolom Praktis 15x15 (Besi D10)", unit: "m1", price: 115000 },
  { id: "RE004", category: "Pembesian", name: "Pembesian Balok Utama 25x40 (Besi D16)", unit: "m1", price: 425000 },
  { id: "RE005", category: "Pembesian", name: "Pembesian Balok Anak 15x25 (Besi D12)", unit: "m1", price: 195000 },
  { id: "RE006", category: "Pembesian", name: "Pembesian Plat Lantai Double Layer D10", unit: "m2", price: 185000 },
  { id: "RE007", category: "Pembesian", name: "Pembesian Plat Lantai Single Layer D8", unit: "m2", price: 95000 },

  // DINDING
  { id: "D001", category: "Dinding", name: "Pasangan Dinding Bata Merah (1:4)", unit: "m2", price: 135000 },
  { id: "D002", category: "Dinding", name: "Pasangan Bata Ringan (Hebel) t=10cm", unit: "m2", price: 115000 },
  { id: "D003", category: "Dinding", name: "Plesteran Dinding (1:4) t=15mm", unit: "m2", price: 65000 },
  { id: "D004", category: "Dinding", name: "Acian Dinding Semen", unit: "m2", price: 35000 },
  { id: "D005", category: "Dinding", name: "Dinding Gypsum 9mm (1 Sisi + Rangka)", unit: "m2", price: 125000 },
  { id: "D006", category: "Dinding", name: "Dinding Gypsum 9mm (2 Sisi + Rangka)", unit: "m2", price: 185000 },
  { id: "D007", category: "Dinding", name: "Dinding Gypsum 12mm (2 Sisi + Rangka)", unit: "m2", price: 225000 },
  { id: "D008", category: "Dinding", name: "Corner Bead (Gypsum/Plesteran)", unit: "m1", price: 25000 },
  { id: "D009", category: "Dinding", name: "Wallmoulding PVC Minimalis", unit: "m1", price: 85000 },
  { id: "D010", category: "Dinding", name: "Spot Profil Dinding (Custom Design)", unit: "m2", price: 450000 },
  { id: "D011", category: "Dinding", name: "Pasang Shadowline Gypsum", unit: "m1", price: 15000 },

  // KUSEN, PINTU & JENDELA
  { id: "K001", category: "Kusen", name: "Kusen Aluminium 4 inch (Silver/Black)", unit: "m1", price: 125000 },
  { id: "K002", category: "UPVC", name: "Kusen UPVC Conch (Putih)", unit: "m1", price: 185000 },
  { id: "K003", category: "UPVC", name: "Kusen UPVC Conch (Serat Kayu)", unit: "m1", price: 245000 },
  { id: "K004", category: "UPVC", name: "Pintu UPVC Conch + Kaca 5mm", unit: "unit", price: 2850000 },
  { id: "K005", category: "UPVC", name: "Jendela Swing UPVC Conch", unit: "unit", price: 1450000 },
  { id: "K006", category: "UPVC", name: "Jendela Sliding UPVC Conch", unit: "unit", price: 1250000 },

  // PINTU BESI & ROLLING DOOR
  { id: "RD001", category: "Pintu Besi", name: "Rolling Door Aluminium (Manual)", unit: "m2", price: 450000 },
  { id: "RD002", category: "Pintu Besi", name: "Rolling Door Steel t=0.5mm (Manual)", unit: "m2", price: 350000 },
  { id: "RD003", category: "Pintu Besi", name: "Rolling Door Steel t=0.8mm (Manual)", unit: "m2", price: 485000 },
  { id: "RD004", category: "Pintu Besi", name: "Rolling Door Motorized (One Sheet) t=0.5mm", unit: "m2", price: 1250000 },
  { id: "RD005", category: "Pintu Besi", name: "Rolling Door Motorized (Industrial) t=1.0mm", unit: "m2", price: 2250000 },
  { id: "RD006", category: "Pintu Besi", name: "Folding Gate t=0.5mm (Manual)", unit: "m2", price: 550000 },
  { id: "RD007", category: "Pintu Besi", name: "Folding Gate t=0.8mm (Manual)", unit: "m2", price: 750000 },
  { id: "RD008", category: "Pintu Besi", name: "Folding Gate t=1.2mm (Extra Tebal)", unit: "m2", price: 1150000 },
  { id: "RD009", category: "Pintu Besi", name: "Folding Gate Motorized (Heavy Duty)", unit: "m2", price: 2150000 },

  // BAJA, KANOPI & PAGAR
  { id: "ST001", category: "Baja", name: "Baja IWF (Material + Fabrikasi + Pasang)", unit: "kg", price: 28500 },
  { id: "ST002", category: "Baja", name: "Besi Hollow 40x40 (Kanopi/Pagar)", unit: "m1", price: 85000 },
  { id: "ST003", category: "Baja", name: "Besi Hollow 40x60 (Kanopi/Pagar)", unit: "m1", price: 115000 },
  { id: "ST004", category: "Baja", name: "Besi Hollow 50x100 (Rangka Utama)", unit: "m1", price: 185000 },
  { id: "ST005", category: "Baja", name: "Pengelasan Konstruksi Baja", unit: "cm", price: 7500 },
  { id: "PG001", category: "Pagar", name: "Pagar Besi Hollow Minimalis", unit: "m2", price: 650000 },
  { id: "PG002", category: "Pagar", name: "Pagar Besi Tempa (Klasik)", unit: "m2", price: 1250000 },
  { id: "PG003", category: "Pagar", name: "Pagar Stainless Steel 304", unit: "m2", price: 1850000 },
  { id: "PG004", category: "Pagar", name: "Pagar Kayu / GRC Wood Plank", unit: "m2", price: 450000 },

  // PLAFON
  { id: "F001", category: "Plafon", name: "Plafon Gypsum 9mm + Rangka Hollow", unit: "m2", price: 115000 },
  { id: "F002", category: "Plafon", name: "Plafon PVC High Quality + Rangka", unit: "m2", price: 185000 },
  { id: "F003", category: "Plafon", name: "Plafon PVC Ornamen / Motif Kayu", unit: "m2", price: 215000 },
  { id: "F004", category: "Plafon", name: "Drop Ceiling Gypsum (per m lari)", unit: "m1", price: 75000 },
  { id: "F005", category: "Plafon", name: "Up Ceiling Gypsum (per m lari)", unit: "m1", price: 85000 },
  { id: "F006", category: "Plafon", name: "Ornamen Ceiling / Center Piece", unit: "unit", price: 250000 },
  { id: "F007", category: "Plafon", name: "List Profile Plafon 15cm", unit: "m1", price: 45000 },

  // LANTAI
  { id: "LT001", category: "Lantai", name: "Keramik Lantai 40x40 (Terpasang)", unit: "m2", price: 145000 },
  { id: "LT002", category: "Lantai", name: "Keramik Lantai 60x60 (Terpasang)", unit: "m2", price: 185000 },
  { id: "LT003", category: "Lantai", name: "Granit Tile 60x60 (Terpasang)", unit: "m2", price: 285000 },
  { id: "LT004", category: "Lantai", name: "Granit Tile 80x80 (Terpasang)", unit: "m2", price: 385000 },
  { id: "LT005", category: "Lantai", name: "Vinyl Flooring Click Lock (Terpasang)", unit: "m2", price: 180000 },
  { id: "LT006", category: "Lantai", name: "Parket Kayu Solid (Terpasang)", unit: "m2", price: 550000 },
  { id: "LT007", category: "Lantai", name: "Epoxy Coating Lantai 2 Lapis", unit: "m2", price: 120000 },

  // ATAP
  { id: "AT001", category: "Atap", name: "Rangka Atap Baja Ringan", unit: "m2", price: 165000 },
  { id: "AT002", category: "Atap", name: "Rangka Atap Kayu (Kaso + Reng)", unit: "m2", price: 195000 },
  { id: "AT003", category: "Atap", name: "Genteng Metal Stone Coated", unit: "m2", price: 185000 },
  { id: "AT004", category: "Atap", name: "Genteng Keramik", unit: "m2", price: 155000 },
  { id: "AT005", category: "Atap", name: "Atap Spandek / Galvanis", unit: "m2", price: 135000 },
  { id: "AT006", category: "Atap", name: "Talang Air PVC", unit: "m1", price: 85000 },

  // MEBEL & INTERIOR
  { id: "FR001", category: "Mebel", name: "Backdrop TV HPL (Custom Design)", unit: "m2", price: 1850000 },
  { id: "FR002", category: "Mebel", name: "Backdrop Headboard Bed HPL", unit: "m2", price: 1650000 },
  { id: "FR003", category: "Mebel", name: "Lemari Pakaian Finishing Duco", unit: "m2", price: 3250000 },
  { id: "FR004", category: "Mebel", name: "Lemari Pakaian Finishing Veneer", unit: "m2", price: 3850000 },
  { id: "FR005", category: "Mebel", name: "Kitchen Set Finishing HPL (per m lari)", unit: "m1", price: 2250000 },
  { id: "FR006", category: "Mebel", name: "Kitchen Set Finishing Duco (per m lari)", unit: "m1", price: 3500000 },
  { id: "FR007", category: "Mebel", name: "Rak / Ambalan Dinding (per m lari)", unit: "m1", price: 350000 },
  { id: "FR008", category: "Mebel", name: "Ambalan Kaca 8mm (Custom Size)", unit: "m2", price: 450000 },
  { id: "FR009", category: "Mebel", name: "Meja Kantor / Kerja Finishing HPL", unit: "unit", price: 1850000 },
  { id: "FR010", category: "Mebel", name: "Lemari Buku / Rak Pajangan HPL", unit: "m2", price: 1950000 },
  { id: "FR011", category: "Mebel", name: "Lemari Pajangan Kaca (Display Case)", unit: "m2", price: 2850000 },

  // MEKANIKAL & MEP
  { id: "ME001", category: "Mekanikal", name: "Ducting Exhaust BJLS 0.5", unit: "m2", price: 285000 },
  { id: "ME002", category: "Mekanikal", name: "Grill / Diffuser Supply Aluminium", unit: "unit", price: 185000 },
  { id: "ME003", category: "Mekanikal", name: "Exhaust Hood Stainless Steel Kitchen", unit: "unit", price: 4500000 },
  { id: "ME004", category: "Mekanikal", name: "Instalasi Pipa Gas Black Steel 1/2\"", unit: "m1", price: 145000 },
  { id: "ME005", category: "Mekanikal", name: "Pompa Hisap (Jet Pump) 250W", unit: "unit", price: 2250000 },
  { id: "ME006", category: "Mekanikal", name: "Pompa Pendorong (Booster Pump)", unit: "unit", price: 1450000 },
  { id: "ME007", category: "Mekanikal", name: "Bak Kontrol Pasangan Bata 40x40", unit: "unit", price: 350000 },
  { id: "ME008", category: "Mekanikal", name: "Toren Air Stainless 1000L", unit: "unit", price: 2800000 },
  { id: "ME009", category: "Mekanikal", name: "Pipa Air Bersih PPR", unit: "m1", price: 85000 },
  { id: "ME010", category: "Mekanikal", name: "Pipa Air Kotor PVC", unit: "m1", price: 65000 },

  // LISTRIK & LIGHTING
  { id: "E001", category: "Listrik", name: "Instalasi Titik Listrik (Stop Kontak/Saklar/Lampu)", unit: "titik", price: 285000 },
  { id: "E002", category: "Listrik", name: "LED Strip Lighting (per m lari)", unit: "m1", price: 65000 },
  { id: "E003", category: "Listrik", name: "Driver / Adaptor LED Strip", unit: "unit", price: 125000 },
  { id: "E004", category: "Listrik", name: "Lampu Spotlight Rail (Set 3 Lampu)", unit: "set", price: 850000 },
  { id: "E005", category: "Listrik", name: "Downlight LED 7W Recessed", unit: "titik", price: 250000 },
  { id: "E006", category: "Listrik", name: "AC Split 1 PK (Supply + Install)", unit: "unit", price: 3800000 },
  { id: "E007", category: "Listrik", name: "Panel Listrik MDP + MCB", unit: "unit", price: 4500000 },

  // KOLAM RENANG & KOLAM IKAN
  { id: "PL001", category: "Kolam", name: "Kolam Renang Tipe Skimmer (Konstruksi)", unit: "m2", price: 4500000 },
  { id: "PL002", category: "Kolam", name: "Kolam Renang Tipe Overflow (Konstruksi)", unit: "m2", price: 5500000 },
  { id: "PL003", category: "Kolam", name: "Pasang Mozaik Kolam Renang", unit: "m2", price: 450000 },
  { id: "PL004", category: "Kolam", name: "Pompa Kolam Renang 1 HP (Hayward)", unit: "unit", price: 8500000 },
  { id: "PL005", category: "Kolam", name: "Filter Kolam Renang (Sand Filter)", unit: "unit", price: 6500000 },
  { id: "PL006", category: "Kolam", name: "Lampu Kolam Renang LED (Underwater)", unit: "unit", price: 1250000 },
  { id: "PL007", category: "Kolam", name: "Kolam Ikan Koi Minimalis + Filter", unit: "m2", price: 3500000 },

  // SIGNAGE & LOGO
  { id: "SG001", category: "Signage", name: "Logo Acrylic + LED Backlit (per cm)", unit: "cm", price: 15000 },
  { id: "SG002", category: "Signage", name: "Logo Stainless Steel (per cm)", unit: "cm", price: 25000 },
  { id: "SG003", category: "Signage", name: "Neon Box 2 Sisi (Custom Size)", unit: "m2", price: 2500000 },
  { id: "SG004", category: "Signage", name: "Papan Nama Kantor (Acrylic/Stainless)", unit: "unit", price: 1850000 },

  // DESAIN & JASA PROFESIONAL
  { id: "DS001", category: "Desain", name: "Jasa Desain Interior (3D + Gambar Kerja)", unit: "m2", price: 150000 },
  { id: "DS002", category: "Desain", name: "Jasa Desain Arsitektur (Fasad + Denah + IMB)", unit: "m2", price: 100000 },
  { id: "DS003", category: "Desain", name: "Jasa Survey Lokasi & Konsultasi Teknis", unit: "ls", price: 500000 },

  // MAINTENANCE & MINOR WORKS
  { id: "M001", category: "Maintenance", name: "Pasang / Ganti Handle Pintu", unit: "set", price: 250000 },
  { id: "M002", category: "Maintenance", name: "Perbaikan Atap Bocor (per titik)", unit: "ls", price: 350000 },
  { id: "M003", category: "Maintenance", name: "Service AC (Cuci + Isi Freon)", unit: "unit", price: 350000 },
  { id: "M004", category: "Maintenance", name: "Pembersihan Akhir Proyek", unit: "ls", price: 500000 },
  { id: "M005", category: "Maintenance", name: "Mobilisasi & Demobilisasi Alat Berat", unit: "ls", price: 1500000 },
];

export const UNIT_OPTIONS = [
  "m2", "m3", "m1", "unit", "titik", "kg", "ls", "set",
  "buah", "hari", "cm", "lembar", "roll",
];

export const PROJECT_CATEGORIES = [
  "Persiapan", "Galian", "Pondasi", "Beton", "Pembesian",
  "Dinding", "UPVC", "Kusen", "Pintu Besi", "Baja", "Pagar",
  "Plafon", "Lantai", "Atap", "Mebel", "Mekanikal",
  "Listrik", "Kolam", "Signage", "Desain", "Maintenance",
];

// ─── Brand Assets ─────────────────────────────────────────────────────────────
// Update these URLs to your actual logo URLs (Google Drive, CDN, etc.)
export const TBJ_LOGO = "https://storage.googleapis.com/tbj-assets/logo.png";
export const TBJ_LOGO_HEADER = "https://storage.googleapis.com/tbj-assets/logo-header.png";
export const TBJ_LOGO_FOOTER = "https://storage.googleapis.com/tbj-assets/logo-footer.png";

// Fallback SVG logo (used when image fails to load)
export const TBJ_LOGO_SVG = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%23FF6B00'/><text y='68' x='50' text-anchor='middle' font-size='52' fill='white' font-weight='900' font-family='system-ui'>T</text></svg>`;
