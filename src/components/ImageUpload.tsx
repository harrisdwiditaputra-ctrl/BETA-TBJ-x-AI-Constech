import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Camera, Image as ImageIcon, Loader2, X } from "lucide-react";
import { uploadImage } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  path: string;
  label?: string;
  className?: string;
  capture?: "user" | "environment";
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onUploadComplete, 
  path, 
  label = "Upload Image", 
  className,
  capture = "environment"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const fullPath = `${path}/${Date.now()}_${file.name}`;
      const url = await uploadImage(file, fullPath, (p) => setProgress(p));
      onUploadComplete(url);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border-2 border-dashed border-neutral-200 hover:border-black hover:bg-neutral-50"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {isUploading ? `Uploading ${Math.round(progress)}%` : label}
        </span>
      </Button>

      {isUploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1" />
          <p className="text-[8px] font-bold uppercase text-neutral-400 text-center">
            Mohon tunggu, jangan tutup halaman ini...
          </p>
        </div>
      )}
    </div>
  );
};
