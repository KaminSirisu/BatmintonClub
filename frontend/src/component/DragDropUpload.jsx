import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLanguage } from '../utils/LanguageProvider.jsx';

export default function DragDropUpload({ onFileSelected, uploadedSlipUrl = null }) {
  const { t } = useLanguage();
  const [filePreview, setFilePreview] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [fileSize, setFileSize] = useState(null);

  // Load the previously uploaded slip if available and no new file selected
  useEffect(() => {
    if (uploadedSlipUrl && !filePreview) {
      setFilePreview(uploadedSlipUrl);
      setFileName("Previously uploaded slip");
      setFileSize(null); // You could display size if you fetch metadata
    }
  }, [uploadedSlipUrl, filePreview]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024).toFixed(2));
    onFileSelected(file);

    // Cleanup the object URL when component unmounts or new file is chosen
    return () => URL.revokeObjectURL(objectUrl);

  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  return (
    <div>
      {/* Dropzone container */}
      <div {...getRootProps()} className="bg-blue-50 p-6 border-2 border-blue-400 hover:border-blue-600 border-dashed rounded-lg text-center transition cursor-pointer">
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="font-medium text-gray-700">
            {isDragActive ? "Drop the file here..." : t("Drop your file here or click to browse")}
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 px-4 py-1 rounded text-white text-sm">{t('Choose File')}</button>

          {filePreview && (
            <div className="pt-4">
              <img
                src={filePreview}
                alt="Preview"
                className="shadow mx-auto border rounded w-24 h-36 object-contain"
              />
              <div className="mt-2 text-gray-600 text-sm">
                {fileName}{fileSize && ` — ${fileSize} MB`}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
