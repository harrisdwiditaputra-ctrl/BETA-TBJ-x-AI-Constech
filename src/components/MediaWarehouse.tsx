import React, { useState } from "react";
import { useMediaAssets, useAuth, useProjects, saveImageToGudang } from "@/lib/hooks";
import { MediaAsset, MediaCategory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Trash2, Download, Image as ImageIcon, FileText, Filter, MoreVertical, ExternalLink, HardDrive, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";

const MediaWarehouse = () => {
  const { user } = useAuth();
  const { assets, loading, addAsset, deleteAsset } = useMediaAssets();
  const { projects } = useProjects();
  
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'all'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const [newAsset, setNewAsset] = useState<Partial<MediaAsset>>({
    name: "",
    url: "",
    category: "marketing",
    description: ""
  });

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) || 
                         asset.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = async () => {
    if (!newAsset.name || !newAsset.url || !newAsset.category) {
      toast.error("Silakan isi semua data wajib.");
      return;
    }

    await addAsset({
      name: newAsset.name,
      url: newAsset.url,
      category: newAsset.category as MediaCategory,
      projectId: newAsset.projectId,
      description: newAsset.description,
      uploadedBy: user?.uid || "unknown",
      uploadedByName: user?.displayName || "Admin",
      createdAt: new Date().toISOString()
    });

    setShowAddDialog(false);
    setNewAsset({ name: "", url: "", category: "marketing", description: "" });
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Total Assets", value: assets.length, icon: HardDrive, color: "text-blue-600" },
          { label: "System Media", value: assets.filter(a => a.category === 'system').length, icon: ImageIcon, color: "text-orange-600" },
          { label: "Marketing", value: assets.filter(a => a.category === 'marketing').length, icon: Filter, color: "text-purple-600" },
          { label: "Project Media", value: assets.filter(a => a.category === 'projects').length, icon: FileText, color: "text-green-600" },
        ].map((stat, i) => (
          <Card key={i} className="border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-black mt-1">{stat.value}</p>
                </div>
                <div className={cn("p-2 rounded-xl bg-neutral-50", stat.color)}>
                  <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-white border-2 border-black rounded-2xl overflow-x-auto w-full md:w-auto p-1 no-scrollbar">
          {['all', 'system', 'finance', 'marketing', 'projects'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={cn(
                "px-3 md:px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl whitespace-nowrap",
                selectedCategory === cat ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(100,100,100,1)]" : "text-neutral-500 hover:bg-neutral-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Cari aset..."
              className="pl-10 h-11 border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger render={
              <Button className="h-11 px-6 rounded-2xl bg-black text-white hover:bg-neutral-800 transition-all font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] active:translate-y-1 active:shadow-none shrink-0" />
            }>
              <Plus className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Upload Aset</span>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Tambah Aset Media</DialogTitle>
                <p className="text-neutral-500 font-bold uppercase text-[10px]">Pusat Manajemen Media TBJ Constech</p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="uppercase-soft text-[10px]">Nama Aset</Label>
                  <Input 
                    placeholder="Contoh: Logo Header 2024" 
                    className="h-11 border-2 border-black rounded-xl"
                    value={newAsset.name}
                    onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase-soft text-[10px]">Pilih File / Take Photo</Label>
                  <ImageUpload 
                    path={newAsset.category === 'system' ? 'system' : 'media'}
                    label="Pilih File / Camera"
                    onUploadComplete={(url) => setNewAsset({...newAsset, url})}
                  />
                  {newAsset.url && (
                    <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border-2 border-black flex items-center justify-center bg-neutral-50 px-4">
                      <img src={newAsset.url} alt="Preview" className="h-full object-contain" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase-soft text-[10px]">Kategori</Label>
                    <Select 
                      value={newAsset.category} 
                      onValueChange={(val: any) => setNewAsset({...newAsset, category: val})}
                    >
                      <SelectTrigger className="h-11 border-2 border-black rounded-xl">
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="projects">Projects</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newAsset.category === 'projects' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label className="uppercase-soft text-[10px]">Pilih Proyek</Label>
                      <Select 
                        value={newAsset.projectId} 
                        onValueChange={(val) => setNewAsset({...newAsset, projectId: val})}
                      >
                        <SelectTrigger className="h-11 border-2 border-black rounded-xl">
                          <SelectValue placeholder="Pilih Proyek" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="uppercase-soft text-[10px]">Keterangan (Opsional)</Label>
                  <Input 
                    placeholder="e.g. Logo transparan untuk watermark" 
                    className="h-11 border-2 border-black rounded-xl"
                    value={newAsset.description}
                    onChange={e => setNewAsset({...newAsset, description: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowAddDialog(false)}>Batal</Button>
                <Button className="btn-sleek rounded-xl px-8" onClick={handleAdd}>Simpan Aset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[800px] md:min-w-full">
            <TableHeader className="bg-neutral-50">
              <TableRow className="border-b-2 border-black">
                <TableHead className="w-20 text-center uppercase-soft text-[10px]">Preview</TableHead>
                <TableHead className="uppercase-soft text-[10px]">Nama Aset</TableHead>
                <TableHead className="uppercase-soft text-[10px]">Kategori</TableHead>
                <TableHead className="uppercase-soft text-[10px]">Sumber File</TableHead>
                <TableHead className="uppercase-soft text-[10px]">Uploader</TableHead>
                <TableHead className="uppercase-soft text-[10px]">Tanggal</TableHead>
                <TableHead className="text-right uppercase-soft text-[10px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center uppercase font-black text-neutral-400">Memuat Gudang Media...</TableCell>
                </TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-neutral-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="uppercase font-black text-xs">Belum ada aset tersimpan.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id} className="border-b-2 border-black/5 hover:bg-neutral-50 transition-colors group">
                    <TableCell>
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden border border-black/5 group-hover:border-black transition-all mx-auto">
                        {asset.url.match(/\.(jpeg|jpg|gif|png|webp)/) || asset.url.includes('create-qr-code') || asset.url.includes('api.qrserver.com') ? (
                          <img 
                            src={asset.url} 
                            alt={asset.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-black text-xs uppercase tracking-tight">{asset.name}</p>
                      <p className="text-[9px] text-neutral-400 uppercase font-bold truncate max-w-[200px]">{asset.description || "Tidak ada keterangan."}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-3 py-1 rounded-full",
                        asset.category === 'system' ? "bg-orange-100 text-orange-600 border border-orange-200" :
                        asset.category === 'finance' ? "bg-green-100 text-green-600 border border-green-200" :
                        asset.category === 'marketing' ? "bg-purple-100 text-purple-600 border border-purple-200" :
                        "bg-blue-100 text-blue-600 border border-blue-200"
                      )}>
                        {asset.category}
                      </Badge>
                      {asset.projectId && (
                        <p className="text-[8px] font-bold text-neutral-400 uppercase mt-1 truncate max-w-[100px]">
                          ID: {asset.projectId}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[9px] text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{asset.url}</span>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 hover:text-black transition-colors" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[8px] font-black uppercase">
                          {asset.uploadedByName?.[0] || 'A'}
                        </div>
                        <span className="text-[10px] font-black uppercase text-neutral-600">{asset.uploadedByName || "Admin"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[9px] font-bold text-neutral-400 uppercase">
                      {new Date(asset.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                          onClick={() => {
                            if (confirm("Hapus aset media ini?")) deleteAsset(asset.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="flex gap-4 p-4 md:p-6 bg-amber-50 rounded-3xl border-2 border-amber-200 border-dashed">
        <div className="bg-amber-100 p-3 rounded-2xl shrink-0 h-fit">
          <Upload className="w-6 h-6 text-amber-600" />
        </div>
        <div className="space-y-1">
          <p className="font-black uppercase tracking-tighter text-amber-900 text-sm">Informasi Penyimpanan</p>
          <p className="text-[10px] text-amber-700 font-bold leading-relaxed max-w-2xl">
            Semua URL gambar yang dimasukkan di sini harus berupa direct link agar dapat ditampilkan dengan benar. 
            Gambar kategori <span className="underline">system</span> akan otomatis digunakan sebagai Logo di Header & PDF, 
            kategori <span className="underline">finance</span> untuk QRIS, dan <span className="underline">projects</span> akan muncul di dashboard progress klien.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MediaWarehouse;
