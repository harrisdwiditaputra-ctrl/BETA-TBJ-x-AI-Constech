import { WorkItemMaster } from "./types";

export const WORK_ITEMS_MASTER: WorkItemMaster[] = [
  // ==========================================
  // 1. PEKERJAAN PERSIAPAN, GALIAN & TANAH
  // ==========================================
  { id: "P001", code: "P001", category: "Persiapan", name: "Pembersihan Lapangan dan Perataan", unit: "m2", price: 20250, status: "visible", soldCount: 0, revenue: 0 },
  { id: "P002", code: "P002", category: "Persiapan", name: "Pasang Bouwplank", unit: "m1", price: 60750, status: "visible", soldCount: 0, revenue: 0 },
  { id: "P003", code: "P003", category: "Persiapan", name: "Direksi Keet / Gudang Sementara", unit: "m2", price: 1012500, status: "visible", soldCount: 0, revenue: 0 },
  { id: "P004", code: "P004", category: "Persiapan", name: "Pagar Proyek Seng Gelombang t=2m", unit: "m1", price: 303750, status: "visible", soldCount: 0, revenue: 0 },
  { id: "G001", code: "G001", category: "Galian", name: "Galian Tanah Pondasi (kedalaman < 1m)", unit: "m3", price: 101250, status: "visible", soldCount: 0, revenue: 0 },
  { id: "G002", code: "G002", category: "Galian", name: "Galian Tanah Pondasi (kedalaman 1-2m)", unit: "m3", price: 128250, status: "visible", soldCount: 0, revenue: 0 },
  { id: "G003", code: "G003", category: "Galian", name: "Urugan Pasir Bawah Pondasi", unit: "m3", price: 297000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "G004", code: "G004", category: "Galian", name: "Urugan Tanah Kembali", unit: "m3", price: 47250, status: "visible", soldCount: 0, revenue: 0 },
  { id: "G005", code: "G005", category: "Galian", name: "Urugan Tanah Peninggian Lantai (Sirtu)", unit: "m3", price: 249750, status: "visible", soldCount: 0, revenue: 0 },
  { id: "G008", code: "G008", category: "Galian", name: "Pekerjaan Plur / Screed Lantai t=3cm", unit: "m2", price: 74250, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 2. STRUKTUR BETON & PEMBESIAN
  // ==========================================
  { id: "B001", code: "B001", category: "Pondasi", name: "Pasangan Pondasi Batu Kali (1:4)", unit: "m3", price: 950000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B002", code: "B002", category: "Beton", name: "Beton Sloof 15/20 (K-175)", unit: "m3", price: 3800000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B006", code: "B006", category: "Beton", name: "Beton Struktur K-250 (Ready Mix)", unit: "m3", price: 1250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B007", code: "B007", category: "Beton", name: "Beton Struktur K-300 (Ready Mix)", unit: "m3", price: 1350000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B010", code: "B010", category: "Beton", name: "Cor Plat Lantai Beton t=12cm (K-250)", unit: "m2", price: 225000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B017", code: "B017", category: "Beton", name: "Prestressed Concrete Pile (Paku Bumi) D=40cm", unit: "m1", price: 850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B018", code: "B018", category: "Beton", name: "Bored Pile D=60cm (Kedalaman 12m)", unit: "m1", price: 1250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B019", code: "B019", category: "Beton", name: "Beton Struktur K-350 (Ready Mix)", unit: "m3", price: 1450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B020", code: "B020", category: "Beton", name: "Beton Struktur K-400 (High Strength)", unit: "m3", price: 1650000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "B021", code: "B021", category: "Beton", name: "Sewa Concrete Pump (Belalai) per 8 jam", unit: "ls", price: 6500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "RE001", code: "RE001", category: "Pembesian", name: "Pembesian Kolom Utama (Besi 16mm ke atas)", unit: "kg", price: 18500, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ST002_S", code: "ST002_S", category: "Sipil", name: "Pondasi Tapak (Footplat) 80x80 Besi D13", unit: "titik", price: 1850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ST003_S", code: "ST003_S", category: "Sipil", name: "Pembesian Besi Beton Ulir (D13/D16)", unit: "kg", price: 18500, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ST004_S", code: "ST004_S", category: "Sipil", name: "Pembesian Besi Beton Polos (8mm/10mm)", unit: "kg", price: 17000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ST005_S", code: "ST005_S", category: "Sipil", name: "Bekisting Kolom/Balok (Plywood 9mm + Kayu 5/7)", unit: "m2", price: 195000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 3. PEKERJAAN LANTAI, DINDING & FINISHING
  // ==========================================
  { id: "D001", code: "D001", category: "Dinding", name: "Pasangan Dinding Bata Merah (1:4)", unit: "m2", price: 135000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "D002", code: "D002", category: "Dinding", name: "Pasangan Dinding Bata Ringan (Hebel) t=10cm", unit: "m2", price: 115000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CR001", code: "CR001", category: "Lantai", name: "Pasang Lantai Keramik 30x30", unit: "m2", price: 165000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CR002", code: "CR002", category: "Lantai", name: "Pasang Lantai Keramik 40x40", unit: "m2", price: 185000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CR003", code: "CR003", category: "Lantai", name: "Pasang Lantai Keramik 60x60", unit: "m2", price: 215000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CR004", code: "CR004", category: "Dinding", name: "Pasang Dinding Keramik 30x60", unit: "m2", price: 235000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CR005", code: "CR005", category: "Dinding", name: "Pasang Dinding Keramik Mozaik (Kamar Mandi)", unit: "m2", price: 350000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HT001", code: "HT001", category: "Lantai", name: "Pasang HT 60x60 (Polished/Unpolished)", unit: "m2", price: 285000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HT002", code: "HT002", category: "Lantai", name: "Pasang HT 80x80 (Double Loading)", unit: "m2", price: 375000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HT003", code: "HT003", category: "Lantai", name: "Pasang HT 60x120 (Slab Look)", unit: "m2", price: 485000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HT004", code: "HT004", category: "Lantai", name: "Pasang HT Big Slab 100x100 / 120x120", unit: "m2", price: 650000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HT005", code: "HT005", category: "Lantai", name: "Pasang HT Big Slab 120x240 (Quadra/Setara)", unit: "m2", price: 1350000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "MR001", code: "MR001", category: "Marmer", name: "Pasang Marmer Lokal (Ujung Pandang/Lampu)", unit: "m2", price: 1250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "MR002", code: "MR002", category: "Marmer", name: "Pasang Marmer Import Carrara (Slab)", unit: "m2", price: 3200000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "MR003", code: "MR003", category: "Marmer", name: "Pasang Marmer Import Statuario / Calacatta", unit: "m2", price: 5500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "MR004", code: "MR004", category: "Marmer", name: "Pasang Granit Slab Black Gold / Nero", unit: "m2", price: 2150000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "MR005", code: "MR005", category: "Marmer", name: "Pekerjaan Kristalisasi / Polish Marmer", unit: "m2", price: 95000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "MR006", code: "MR006", category: "Marmer", name: "Pekerjaan Coating Anti-Noda (Stone Care)", unit: "m2", price: 55000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "MR007", code: "MR007", category: "Marmer", name: "Adu Manis Marmer / Bevel (m1)", unit: "m1", price: 75000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 4. KUSEN, PINTU, JENDELA & FASAD
  // ==========================================
  { id: "K001", code: "K001", category: "Kusen", name: "Kusen Alumunium 4 inch (YKK/Setara)", unit: "m1", price: 185000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "K002", code: "K002", category: "UPVC", name: "Kusen UPVC Conch (Putih)", unit: "m1", price: 185000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "K004", code: "K004", category: "UPVC", name: "Pintu UPVC Conch + Kaca 5mm", unit: "unit", price: 2850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT001", code: "PT001", category: "Pintu", name: "Pintu Solid Wood (Kamper Samarinda Oven)", unit: "unit", price: 4850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT002", code: "PT002", category: "Pintu", name: "Pintu Engineering Door Finishing HPL", unit: "unit", price: 3200000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT003", code: "PT003", category: "Pintu", name: "Pintu Finishing Veneer (Natural Wood Look)", unit: "unit", price: 4500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT004", code: "PT004", category: "Pintu", name: "Pintu Finishing Duco (White High Gloss)", unit: "unit", price: 5200000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT005", code: "PT005", category: "Pintu", name: "Pintu Hidden Door (Frameless Style)", unit: "unit", price: 6500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT006", code: "PT006", category: "Pintu", name: "Pintu Sliding Frame Alumunium Slim", unit: "unit", price: 4250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FS001", code: "FS001", category: "Fasad", name: "Pasang Curtain Wall Kaca 8mm (Reflective)", unit: "m2", price: 1850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FS002", code: "FS002", category: "Fasad", name: "Pasang ACP (Alumunium Composite Panel) PVDF", unit: "m2", price: 850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FS003", code: "FS003", category: "Fasad", name: "Gondola Mobilization (untuk Fasad Highrise)", unit: "ls", price: 15000000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "RD005", code: "RD005", category: "Pintu Besi", name: "Rolling Door Motorized (Industrial) t=1.0mm", unit: "m2", price: 2250000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 5. SANITAIR & PLUMBING
  // ==========================================
  { id: "SN001", code: "SN001", category: "Sanitair", name: "Pasang Closet Duduk (Toto/Kohler Standard)", unit: "unit", price: 485000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN002", code: "SN002", category: "Sanitair", name: "Pasang Closet Duduk Intelligent/Smart Toilet", unit: "unit", price: 1250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN003", code: "SN003", category: "Sanitair", name: "Pasang Washtafel Gantung / Countertop", unit: "unit", price: 350000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN004", code: "SN004", category: "Sanitair", name: "Pasang Washtafel Pedestal (Standing)", unit: "unit", price: 450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN005", code: "SN005", category: "Sanitair", name: "Pasang Bak Cuci Piring (Kitchen Sink) 1 Lubang", unit: "unit", price: 375000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN006", code: "SN006", category: "Sanitair", name: "Pasang Bak Cuci Piring (Kitchen Sink) 2 Lubang", unit: "unit", price: 585000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN007", code: "SN007", category: "Sanitair", name: "Pasang Bathtub Standalone / Tanam", unit: "unit", price: 2150000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN008", code: "SN008", category: "Sanitair", name: "Pasang Kran Washtafel / Shower Set", unit: "unit", price: 185000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN009", code: "SN009", category: "Sanitair", name: "Pasang Water Heater Electric/Gas (Unit+Instalasi)", unit: "unit", price: 3200000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN010", code: "SN010", category: "Sanitair", name: "Instalasi Floor Drain Anti-Odor", unit: "unit", price: 65000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN001_T", code: "SN001_T", category: "Sanitari", name: "Closet Duduk TOTO CW421J (White)", unit: "unit", price: 2850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "SN002_T", code: "SN002_T", category: "Sanitari", name: "Wastafel TOTO L237 + Kran Dingin", unit: "set", price: 1450000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 6. MEKANIKAL, ELEKTRIKAL & LISTRIK (MEP)
  // ==========================================
  { id: "E006", code: "E006", category: "Listrik", name: "Instalasi Titik Lampu (Kabel Supreme)", unit: "titik", price: 225000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "E007", code: "E007", category: "Listrik", name: "Instalasi Stop Kontak / Saklar", unit: "titik", price: 185000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "E008", code: "E008", category: "Listrik", name: "Pasang Panel Listrik (Box + MCB 1 Phase)", unit: "unit", price: 850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "E009", code: "E009", category: "Listrik", name: "Instalasi Titik Smart Home (Cabling + Hub)", unit: "titik", price: 450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "E010", code: "E010", category: "Listrik", name: "Pasang Panel Listrik 3 Phase (Gedung)", unit: "unit", price: 7500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "E011", code: "E011", category: "Listrik", name: "Pasang CCTV IP Camera (Instalasi + Setting)", unit: "titik", price: 550000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "E012", code: "E012", category: "Listrik", name: "Instalasi Penangkal Petir (Radius System)", unit: "ls", price: 12500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "EL013", code: "EL013", category: "Listrik", name: "Instalasi Titik Lampu/Stop Kontak (Kabel Eterna)", unit: "tk", price: 325000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "EL014", code: "EL014", category: "Listrik", name: "Instalasi LED Track Spotlight (Warmwhite)", unit: "tk", price: 950000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "EL015", code: "EL015", category: "Listrik", name: "Instalasi Water Heater (Ariston + Westpex)", unit: "ls", price: 3850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "EL020", code: "EL020", category: "Listrik", name: "Lampu Downlight Inlite 7W (Warm White)", unit: "bh", price: 85000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "EL021", code: "EL021", category: "Listrik", name: "Lampu LED Bulb Philips 11W", unit: "bh", price: 65000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "EL022", code: "EL022", category: "Listrik", name: "MCB Schneider 1-Pole (6A/10A/16A)", unit: "unit", price: 95000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ME001", code: "ME001", category: "Mekanikal", name: "Ducting Exhaust BJLS 0.5", unit: "m2", price: 285000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ME002", code: "ME002", category: "Mekanikal", name: "Instalasi Blower/Exhaust Hood 3-Phase (Jasa)", unit: "unit", price: 5500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ME010_P", code: "ME010_P", category: "Mekanikal", name: "Pompa Air Sumur Dangkal Shimizu PS-135", unit: "unit", price: 650000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ME011_T", code: "ME011_T", category: "Mekanikal", name: "Toren Air Penguin 520 Liter (TB55)", unit: "unit", price: 1350000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ME012_S", code: "ME012_S", category: "Mekanikal", name: "Stop Kran Ball Valve Onda 3/4\"", unit: "bh", price: 75000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 7. PEKERJAAN ATAP & KANOPI
  // ==========================================
  { id: "R001", code: "R001", category: "Atap", name: "Rangka Atap Baja Ringan t=0.75mm", unit: "m2", price: 155000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "R002", code: "R002", category: "Atap", name: "Atap Genteng Metal Pasir", unit: "m2", price: 95000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "R003", code: "R003", category: "Atap", name: "Atap Genteng Keramik (Kanmuri/KIA)", unit: "m2", price: 225000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "R004", code: "R004", category: "Atap", name: "Atap Galvalum / Spandek t=0.35mm", unit: "m2", price: 115000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "R005", code: "R005", category: "Atap", name: "Pasang Alumunium Foil Bubble", unit: "m2", price: 45000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "R006", code: "R006", category: "Atap", name: "Pasang Nok / Bubungan Genteng", unit: "m1", price: 85000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "RF001", code: "RF001", category: "Atap", name: "Rangka Atap Baja Ringan (Galvalum 0.75mm)", unit: "m2", price: 185000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "RF003", code: "RF003", category: "Atap", name: "Atap Alderon Double Layer (Premium)", unit: "m2", price: 450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "RF004", code: "RF004", category: "Atap", name: "Atap Spandek Transparan (Fiber)", unit: "m2", price: 175000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CN001", code: "CN001", category: "Kanopi", name: "Rangka Kanopi Hollow Hitam 40x60 (t=1.4mm)", unit: "m2", price: 550000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CN002", code: "CN002", category: "Kanopi", name: "Rangka Kanopi Hollow Galvalum 40x40", unit: "m2", price: 485000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "CN003", code: "CN003", category: "Kanopi", name: "Kanopi Kaca Tempered 8mm + Sealant", unit: "m2", price: 1250000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 8. PEKERJAAN BAJA & KONSTRUKSI BERAT
  // ==========================================
  { id: "ST001", code: "ST001", category: "Baja", name: "Baja IWF (Material + Fabrikasi + Pasang)", unit: "kg", price: 28500, status: "visible", soldCount: 0, revenue: 0 },
  { id: "ST006", code: "ST006", category: "Baja", name: "Fireproofing Struktur Baja (Spray)", unit: "m2", price: 145000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 9. PEKERJAAN MEBEL & INTERIOR
  // ==========================================
  { id: "FR005", code: "FR005", category: "Mebel", name: "Kitchen Set Finishing HPL", unit: "m1", price: 2250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR012", code: "FR012", category: "Mebel", name: "Solid Surface Top Table Kitchen", unit: "m1", price: 1850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR013", code: "FR013", category: "Mebel", name: "Wardrobe / Lemari Full Plafon (HPL)", unit: "m2", price: 2150000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR014", code: "FR014", category: "Mebel", name: "Vanity Mirror Kamar Mandi + LED", unit: "m2", price: 1850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR015", code: "FR015", category: "Mebel", name: "Solid Surface Top Table Kitchen (Custom)", unit: "m1", price: 1950000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR016", code: "FR016", category: "Mebel", name: "Marmer Top Table Kitchen (Import Carrara)", unit: "m1", price: 3850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR017", code: "FR017", category: "Mebel", name: "Kitchen Set Kabinet Bawah (Multiplek 18mm + HPL)", unit: "m1", price: 2850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR018", code: "FR018", category: "Mebel", name: "Kitchen Set Kabinet Atas (Multiplek 18mm + HPL)", unit: "m1", price: 2450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR019", code: "FR019", category: "Mebel", name: "Wardrobe (Lemari Pakaian) Sliding Door HPL", unit: "m2", price: 2250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR020", code: "FR020", category: "Mebel", name: "TV Cabinet Minimalis Finishing Duco", unit: "m2", price: 2750000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR021", code: "FR021", category: "Mebel", name: "Kabinet Foyer Finishing Veneer + Aksesoris Blum", unit: "m2", price: 4250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR022", code: "FR022", category: "Mebel", name: "Meja Island Finishing HPL + Top Table Marmer", unit: "m2", price: 5500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR023", code: "FR023", category: "Mebel", name: "Lemari Display Pintu Kaca Frame Alumunium Bronze", unit: "m2", price: 3850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR024", code: "FR024", category: "Mebel", name: "Kitchen Sink Undermount Stainless (Ex Paloma/Onda)", unit: "ls", price: 2550000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "FR025", code: "FR025", category: "Mebel", name: "Backdrop Bronze Mirror (Cermin Perunggu)", unit: "m2", price: 1450000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 10. PEKERJAAN KACA & PARTISI
  // ==========================================
  { id: "KC001", code: "KC001", category: "Kaca", name: "Pasang Kaca Mati 5mm (Polos)", unit: "m2", price: 285000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "KC002", code: "KC002", category: "Kaca", name: "Pasang Kaca Mati 8mm (Polos)", unit: "m2", price: 425000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "KC003", code: "KC003", category: "Kaca", name: "Pasang Kaca Mati 10mm (Tempered)", unit: "m2", price: 785000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "KC004", code: "KC004", category: "Kaca", name: "Pasang Kaca Mati 12mm (Tempered)", unit: "m2", price: 950000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "KC005", code: "KC005", category: "Kaca", name: "Kaca Cermin 5mm (Bevel Edge)", unit: "m2", price: 550000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "KC006", code: "KC006", category: "Kaca", name: "Partisi Kaca Frameless 12mm (Shower Screen)", unit: "m2", price: 1250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "KC007", code: "KC007", category: "Kaca", name: "Pekerjaan Gosok Mesin / Bevel Kaca", unit: "m1", price: 45000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 11. PEKERJAAN HARDWARE & FITTING
  // ==========================================
  { id: "HW001", code: "HW001", category: "Hardware", name: "Pasang Rel Laci Tandem Box (Blum Original)", unit: "set", price: 1450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW002", code: "HW002", category: "Hardware", name: "Pasang Engsel Sendok Soft Close (Blum Clip Top)", unit: "set", price: 225000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW003", code: "HW003", category: "Hardware", name: "Pasang Lift System Aventos (Blum) untuk Kabinet Atas", unit: "set", price: 3850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW004", code: "HW004", category: "Hardware", name: "Handle Pintu Utama (Solid Brass/Luxury)", unit: "set", price: 1850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW005", code: "HW005", category: "Hardware", name: "Smart Door Lock (Digital Access Fingerprint)", unit: "unit", price: 3500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW001_B", code: "HW001_B", category: "Hardware", name: "Engsel Blum Clip Top Blumotion (Slowmotion)", unit: "pair", price: 215000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW002_B", code: "HW002_B", category: "Hardware", name: "Rel Tandem Blum 50cm (Full Extension)", unit: "set", price: 950000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW003_H", code: "HW003_H", category: "Hardware", name: "Handle Pintu Hafele Lever Handle", unit: "pair", price: 450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "HW004_A", code: "HW004_A", category: "Hardware", name: "Rak Piring Tarik Chrome (Aksesoris Dapur)", unit: "unit", price: 850000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 12. PEKERJAAN FINISHING & WALL
  // ==========================================
  { id: "IF001", code: "IF001", category: "Finishing", name: "Finishing HPL (Standard Motif Kayu/Polos)", unit: "m2", price: 185000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "IF002", code: "IF002", category: "Finishing", name: "Finishing Veneer (Teak/Oak/Walnut) + Coating", unit: "m2", price: 450000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "IF003", code: "IF003", category: "Finishing", name: "Finishing Cat Duco PU (Polyurethane)", unit: "m2", price: 550000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "IF004", code: "IF004", category: "Finishing", name: "Finishing Melamic (Doff/Glossy)", unit: "m2", price: 385000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "IF005", code: "IF005", category: "Wall", name: "Pasang Wall Panel WPC (Wood Plastic Composite)", unit: "m2", price: 550000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "IF006", code: "IF006", category: "Wall", name: "Pasang Wallpaper Vinyl (Standard)", unit: "m2", price: 65000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "IF007", code: "IF007", category: "Wall", name: "Pasang Wall Foam / Acoustic Panel", unit: "m2", price: 225000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "WD001", code: "WD001", category: "Dinding", name: "Partisi Gipsum 2 Sisi (Knauf/Aplus) Rangka Hollow", unit: "m2", price: 285000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "WD002", code: "WD002", category: "Dinding", name: "Pasang Wall Panel WPC (Wood Plastic Composite)", unit: "m2", price: 425000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "WD003", code: "WD003", category: "Dinding", name: "Wallpanel Finishing Veneer Doff Coating (Premium)", unit: "m2", price: 1950000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "WD004", code: "WD004", category: "Dinding", name: "Pekerjaan Pasangan Bata Hebel t=10cm (incl. Plester Acian)", unit: "m2", price: 215000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "WD005", code: "WD005", category: "Dinding", name: "Pekerjaan Laser Cut Backdrop TV (Custom Design)", unit: "m2", price: 2250000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 13. PEKERJAAN BONGKARAN
  // ==========================================
  { id: "DM001", code: "DM001", category: "Bongkaran", name: "Bongkar Vinyl Existing & Pembersihan Lem", unit: "m2", price: 45000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "DM002", code: "DM002", category: "Bongkaran", name: "Bongkar Wallpaper & Perapihan Dinding", unit: "m2", price: 55000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "DM003", code: "DM003", category: "Bongkaran", name: "Bongkar Meja Beton/Dapur & Buang Puing", unit: "ls", price: 850000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "DM004", code: "DM004", category: "Bongkaran", name: "Bongkar Plafon Gipsum/Kayu incl. Rangka", unit: "m2", price: 95000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "DM005", code: "DM005", category: "Bongkaran", name: "Bongkar Keramik Lantai/Dinding & Adukan", unit: "m2", price: 75000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 14. PEKERJAAN PENGECATAN & CAT
  // ==========================================
  { id: "PT007", code: "PT007", category: "Pengecatan", name: "Cat Dinding Interior (Dulux Catylac/Setara)", unit: "m2", price: 75000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT008", code: "PT008", category: "Pengecatan", name: "Cat Dinding Eksterior (Weatherbond/Setara)", unit: "m2", price: 95000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT009", code: "PT009", category: "Pengecatan", name: "Coating Batu Alam (Propan/Setara) - 2 Lapis", unit: "m2", price: 85000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT010", code: "PT010", category: "Pengecatan", name: "Refinish HPL/Veneer (Luar Dalam)", unit: "m2", price: 155000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT011", code: "PT011", category: "Cat", name: "Cat Interior Jotun Majestic (Premium)", unit: "m2", price: 115000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT012", code: "PT012", category: "Cat", name: "Cat Eksterior Dulux Weathershield", unit: "m2", price: 125000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "PT013", code: "PT013", category: "Cat", name: "Mowilex Woodstain (Waterbased)", unit: "m2", price: 95000, status: "visible", soldCount: 0, revenue: 0 },

  // ==========================================
  // 15. PEKERJAAN DESAIN & LAIN-LAIN
  // ==========================================
  { id: "DS001", code: "DS001", category: "Desain", name: "Jasa Desain Interior (3D + Detail)", unit: "m2", price: 150000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "DS001_F", code: "DS001_F", category: "Desain", name: "Jasa Desain Arsitektur & Interior (Full)", unit: "m2", price: 250000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "DS004", code: "DS004", category: "Desain", name: "Pengurusan IMB / PBG (Jasa Saja)", unit: "m2", price: 35000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "M004", code: "M004", category: "Lain-lain", name: "Pembersihan Akhir Proyek (General Cleaning)", unit: "ls", price: 1500000, status: "visible", soldCount: 0, revenue: 0 },
  { id: "M005", code: "M005", category: "Lain-lain", name: "Mobilisasi Alat Berat (Crane/Excavator)", unit: "ls", price: 7500000, status: "visible", soldCount: 0, revenue: 0 },
];
