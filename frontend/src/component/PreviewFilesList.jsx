import { useState } from "react";
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

  return (
    <>
      <div className="gap-2 grid grid-cols-1 sm:grid-cols-2">
        {previewFiles.map(file => (
          <div key={file.fileId} className="space-y-1 shadow p-4 border rounded">
            <p className="font-semibold text-sm">{file.user}</p>
            <div className="flex justify-between items-center text-gray-600 text-sm">
              <span>{new Date(file.timestamp).toLocaleString()}</span>
              <button
                onClick={() => openModal(file)}
                className="ml-2 text-blue-600 hover:underline whitespace-nowrap"
              >
                👁️ {t('Preview Slip')}
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* Fullscreen modal */}
      {selectedFile && (
        <div
          className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-80"
          onClick={closeModal}
        >
          <div className="relative p-4 max-w-full max-h-full">
            <button
              className="top-2 right-2 absolute text-white text-2xl"
              onClick={closeModal}
            >
              ✕
            </button>
            <img
              src={selectedFile.previewUrl}
              alt={t('Slip')}
              className="shadow-lg rounded max-w-[90vw] max-h-[90vh]"
            />
          </div>
        </div>
      )}
    </>
  );
};
export default PreviewFilesList;
