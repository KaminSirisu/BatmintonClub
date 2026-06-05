import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { useLanguage } from '../utils/LanguageProvider.jsx';

const PreviewFilesList = ({ previewFiles }) => {
  const { t } = useLanguage();

  const [selectedFile, setSelectedFile] = useState(null);

  const openModal = (file) => {
    setSelectedFile(file);
  };

  const closeModal = () => {
    setSelectedFile(null);
  };

  useEffect(() => {
    if (!selectedFile) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedFile]);

  return (
    <>
      <div className="gap-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {previewFiles.map(file => (
          <button
            key={file.fileId}
            type="button"
            onClick={() => openModal(file)}
            className="group bg-white hover:bg-blue-50 shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-300 rounded-lg overflow-hidden text-left transition"
          >
            <div className="relative bg-gray-100 aspect-[4/3] overflow-hidden">
              <img
                src={file.previewUrl}
                alt={t('Slip')}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <span className="right-2 bottom-2 absolute flex justify-center items-center bg-white/90 shadow rounded-full w-7 h-7 text-blue-600">
                <Eye className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-0.5 p-2">
              <p className="font-semibold text-gray-800 text-xs truncate">{file.user}</p>
              <p className="text-[10px] text-gray-500 truncate">
                {new Date(file.timestamp).toLocaleString()}
              </p>
            </div>
          </button>
        ))}
      </div>


      {/* Fullscreen modal */}
      {selectedFile && (
        <div
          className="z-50 fixed inset-0 flex justify-center items-start bg-black bg-opacity-80 overflow-y-auto overscroll-contain"
          onClick={closeModal}
        >
          <div className="relative p-4 max-w-full min-h-full" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="top-3 right-3 z-10 fixed flex justify-center items-center bg-black/70 hover:bg-black rounded-full w-10 h-10 text-white transition"
              onClick={closeModal}
              aria-label={t('close')}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedFile.previewUrl}
              alt={t('Slip')}
              className="shadow-lg rounded max-w-[90vw] h-auto"
            />
          </div>
        </div>
      )}
    </>
  );
};
export default PreviewFilesList;
