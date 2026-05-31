import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Navbar from '../component/Navbar';
import Table from '../component/Table';
import BottomNav from '../component/BottomNav';
import { useAuth } from '../utils/AuthContext';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '../utils/LanguageProvider.jsx';
import { toast  } from 'react-hot-toast';

const Setting = () => {
  const { t } = useLanguage(); 
  const [name, setName] = useState("");
  const formRef2 = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [club, setClub] = useState([]);
  const [admin, setAdmin] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [editingClubId, setEditingClubId] = useState(null);
  const { createClubs, getClubData, getAdminNameAcc, updateClub, deleteClub, updateUserName, fetchUser } = useAuth();
  const formRef = useRef(null);
  const [paymentQrFile, setPaymentQrFile] = useState(null);
  const [paymentQrPreview, setPaymentQrPreview] = useState(null);
  const [editPaymentQrFile, setEditPaymentQrFile] = useState(null);
  const [editPaymentQrPreview, setEditPaymentQrPreview] = useState(null);
  const [editFormData, setEditFormData] = useState({
    clubName: '',
    startPrice: '',
    daysPlaying: '',
    startTime: '',
    endTime: '',
    pricePerGame: '',
    paymentBank: '',
    paymentAccountName: '',
    paymentAccountNumber: '',
    paymentQrFileId: null
  })

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const fetchClubs = useCallback(async () => {
    const data = await getClubData();
    setClub(data);
  }, [getClubData]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs])

  useEffect(() => {
    const fetchData = async () => {
      const admin = await getAdminNameAcc(); 
      setAdmin(admin);
    };
    fetchData();
  }, [getAdminNameAcc]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSumbit = async (e) => {
    e.preventDefault();
    const clubName = formRef.current.name.value;
    const startPrice = parseInt(formRef.current.startPrice.value) || 0;
    const pricePerGame = parseInt(formRef.current.pricePerGame.value) || 0;
    const daysPlaying = selectedDays.join(",");
    const startTime = formRef.current.startTime.value;
    const endTime = formRef.current.endTime.value;
    const paymentBank = formRef.current.paymentBank.value;
    const paymentAccountName = formRef.current.paymentAccountName.value;
    const paymentAccountNumber = formRef.current.paymentAccountNumber.value;

    if (!clubName || !startPrice || !pricePerGame || !daysPlaying || !startTime || !endTime) {
      toast.error(t("Please fill out the entire form"));
    } else {
      const userInfo = {
        clubName, 
        startPrice, 
        pricePerGame, 
        daysPlaying, 
        startTime, 
        endTime,
        paymentBank,
        paymentAccountName,
        paymentAccountNumber,
        paymentQrFile,
        paymentQrFileId: null,
      };
      await createClubs(userInfo);
      formRef.current.reset();
      setSelectedDays([]);
      setPaymentQrFile(null);
      setPaymentQrPreview(null);
      await fetchClubs();

      const updatedData = await getClubData();
      setClub(updatedData);
    }

    
  }

  const handleUpdateName = async (e) => {
    e.preventDefault(); // prevent form reload

    try {
      await updateUserName(name);
      await fetchUser(); // refresh user data in UI after update
      // Optionally, reset form or do other UI updates
      setName(""); // clear input after success, or keep as is
    } catch {
      // error handling already done inside updateUserName via toast
    }
  };

  const columns = [
    { header: "name", accessor: "clubName"},
    { header: "startPrice", accessor: "startPrice"},
    { header: "perGame", accessor: "pricePerGame"},
    { header: "playingDays", 
      accessor: (row) => row.playingDay
      .split(',')
      .map(day => t(day.trim()))
      .join(', ')
    },
    { header: "time", 
      accessor: (row) => `${row.startTime} - ${row.endTime}`},
    /*{ header: "End Time", accessor: "endTime"},*/
    
  ]

  const closeModal = () => {
    setIsOpen(false);
    setEditingClubId(null);
    setEditPaymentQrFile(null);
    setEditPaymentQrPreview(null);
  };

  const openEditModal = (clubRow) => {
    setEditFormData({
      clubName: clubRow.clubName,
      startPrice: clubRow.startPrice,
      daysPlaying: clubRow.playingDay,
      startTime: clubRow.startTime,
      endTime: clubRow.endTime,
      pricePerGame: clubRow.pricePerGame,
      paymentBank: clubRow.paymentBank || '',
      paymentAccountName: clubRow.paymentAccountName || '',
      paymentAccountNumber: clubRow.paymentAccountNumber || '',
      paymentQrFileId: clubRow.paymentQrFileId || null,
    });
    setEditPaymentQrPreview(clubRow.paymentQrDisplayUrl || clubRow.paymentQrDownloadUrl || clubRow.paymentQrPreviewUrl || null);
    setEditPaymentQrFile(null);
    setEditingClubId(clubRow.id);
    setIsOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingClubId) return;

    const cleanedFormData = {
      clubName: editFormData.clubName.trim(),
      startPrice: parseInt(editFormData.startPrice, 10) || 0,
      pricePerGame: parseInt(editFormData.pricePerGame, 10) || 0,
      daysPlaying: editFormData.daysPlaying,
      startTime: editFormData.startTime,
      endTime: editFormData.endTime,
      paymentBank: editFormData.paymentBank,
      paymentAccountName: editFormData.paymentAccountName,
      paymentAccountNumber: editFormData.paymentAccountNumber,
      paymentQrFile: editPaymentQrFile,
      paymentQrFileId: editFormData.paymentQrFileId,
    };

    if (
      !cleanedFormData.clubName ||
      !cleanedFormData.startPrice ||
      !cleanedFormData.pricePerGame ||
      !cleanedFormData.daysPlaying ||
      !cleanedFormData.startTime ||
      !cleanedFormData.endTime
    ) {
      toast.error(t("Please fill out the entire form"));
      return;
    }

    try {
      const updatedClub = await updateClub(editingClubId, cleanedFormData);
      if (updatedClub) {
        setClub((prevClub) =>
          prevClub.map((currentClub) =>
            currentClub.id === updatedClub.id ? updatedClub : currentClub
          )
        );
      }
      closeModal();
      await fetchClubs();
    } catch {
      // Keep the modal open if Appwrite rejects the update.
    }
  };

  return (
    <div className="flex flex-col bg-neutral-100 w-full min-h-screen pb-24">
      <Navbar />
      <div className="mx-2 md:mx-4 mt-2 md:mt-4">
        {/* <div className="flex flex-row">
          <button onClick={() => navigate("/")} className="bg-white shadow-lg border rounded-3xl p-0.5" >
            <ArrowLeft className="w-7 md:w-8 h-7 md:h-8 text-blue-600 cursor-pointer" />
          </button>
        </div> */}
        <h1 className="mx-2 md:mx-5 mt-2 md:mt-3 uppercase head-text">{t('setting')}</h1>
      </div>
      <div className="flex-grow">
        {/* Admin Site */}
        {admin.includes("admin") ? (
          <>
            <div className="mt-2 md:mt-10">
              <div className="flex flex-col gap-3 mx-auto px-4 w-full max-w-md">
                <form ref={formRef} className="flex flex-col gap-3" onSubmit={handleSumbit}>
                  <input
                    type="text"
                    name="name"
                    placeholder={t("club name")}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-[10px] md:text-base"
                  />
                  <input
                    type="number"
                    name="startPrice"
                    placeholder={t("startPrice")}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-[10px] md:text-base"
                  />
                  <input
                    type="number"
                    name="pricePerGame"
                    placeholder={t('perGame')}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-[10px] md:text-base"
                  />
                  <div className="gap-y-2 md:gap-x-4 grid grid-cols-4">
                    {daysOfWeek.map((day) => (
                      <label key={day} className="flex items-center gap-1 md:gap-3">
                        <input
                          type="checkbox"
                          value={day}
                          checked={selectedDays.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDays([...selectedDays, day]);
                            } else {
                              setSelectedDays(selectedDays.filter((d) => d !== day));
                            }
                          }}
                        />
                        <span className="text-[12px] md:text-sm">{t(`${day}`)}</span>
                      </label>
                    ))}
                  </div>
                  <label htmlFor="startTime" className="text-[12px] text-gray-600 md:text-base">{t('startTime')}</label>
                  <input
                    type="time"
                    name="startTime"
                    placeholder="Start Time"
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm md:text-base"
                  />
                  <label htmlFor="endTime" className="text-[12px] text-gray-600 md:text-base">{t('endTime')}</label>
                  <input
                    type="time"
                    name="endTime"
                    placeholder="End Time"
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm md:text-base"
                  />
                  <label htmlFor="paymentBank" className="text-[12px] text-gray-600 md:text-base">Payment Bank (e.g., KBank)</label>
                  <input
                    type="text"
                    name="paymentBank"
                    placeholder="Payment Bank"
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-[10px] md:text-base"
                  />
                  <label htmlFor="paymentAccountName" className="text-[12px] text-gray-600 md:text-base">Account Holder Name</label>
                  <input
                    type="text"
                    name="paymentAccountName"
                    placeholder="Account Holder Name"
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-[10px] md:text-base"
                  />
                  <label htmlFor="paymentAccountNumber" className="text-[12px] text-gray-600 md:text-base">Account Number</label>
                  <input
                    type="text"
                    name="paymentAccountNumber"
                    placeholder="Account Number"
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-[10px] md:text-base"
                  />
                  <label htmlFor="paymentQR" className="text-[12px] text-gray-600 md:text-base">Payment QR Code</label>
                  <input
                    type="file"
                    name="paymentQR"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPaymentQrFile(file);
                        const preview = URL.createObjectURL(file);
                        setPaymentQrPreview(preview);
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-[10px] md:text-base"
                  />
                  {paymentQrPreview && (
                    <div className="flex justify-center">
                      <img src={paymentQrPreview} alt="QR Preview" className="w-24 h-24 border rounded" />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 mx-auto mt-3 px-4 py-2 rounded-md w-fit text-white"
                  >
                    <span className="font-semibold text-sm md:text-lg">{t('addClub')}</span>
                  </button>
                </form>
              </div>
              <div className="mt-5 w-full overflow-x-auto">
                <h1 className="flex justify-center mt-5 mb-3 uppercase head-text">{t('yourClubs')}</h1>
                <div>
                  <Table columns={columns} data={club}>
                    {({ headers, rows }) => (
                      <table className="mx-auto mb-10 border border-gray-300 max-w-6xl overflow-x-auto text-[10px] md:text-lg table-auto">
                        <thead className="bg-white">
                          <tr>
                            {headers.map((header, i) => (
                              <th
                                key={i}
                                className="px-6 py-3 font-medium text-gray-500 text-xs md:text-sm text-center uppercase tracking-wider"
                              >
                                {t(`${header}`)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-300">
                          {rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-100">
                              {row.cells.map((cell, j) => (
                                <td
                                  key={j}
                                  className="px-6 py-3 font-medium text-black text-xs md:text-sm text-center tracking-wider"
                                >
                                  {cell}
                                </td>
                              ))}
                              <td className="px-6 py-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    openEditModal(club[i]);
                                  }}
                                  className="text-blue-500 hover:text-blue-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete this club?")) {
                                      await deleteClub(club[i].id);
                                      await fetchClubs();
                                    }
                                  }}
                                  className="ml-2 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </Table>
                </div>
              </div>
            </div>
            {isOpen &&
              ReactDOM.createPortal(
                <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
                  <div className="bg-white shadow-lg p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h2 className="mb-4 font-semibold text-lg">{t('editClub')}</h2>
                    <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
                      <label htmlFor="clubName" className="text-[12px] text-gray-600 md:text-base">
                        {t('club name')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('club name')}
                        value={editFormData.clubName}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, clubName: e.target.value })
                        }
                        className="p-1 border rounded"
                        required
                      />
                      <label htmlFor="startPrice" className="text-[12px] text-gray-600 md:text-base">
                        {t('startPrice')}
                      </label>
                      <input
                        type="number"
                        placeholder={t('startPrice')}
                        value={editFormData.startPrice}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, startPrice: e.target.value })
                        }
                        className="p-1 border rounded"
                        required
                      />
                      <label htmlFor="dayPlaying" className="text-[12px] text-gray-600 md:text-base">
                        {t('playingDays')}
                      </label>
                      <div className="gap-y-2 md:gap-x-4 grid grid-cols-4">
                        {daysOfWeek.map((day) => (
                          <label key={day} className="flex items-center gap-1 md:gap-3">
                            <input
                              type="checkbox"
                              value={day}
                              checked={editFormData.daysPlaying.split(',').includes(day)}
                              onChange={(e) => {
                                let daysArr = editFormData.daysPlaying
                                  ? editFormData.daysPlaying.split(',')
                                  : [];
                                if (e.target.checked) {
                                  daysArr = [...daysArr, day];
                                } else {
                                  daysArr = daysArr.filter((d) => d !== day);
                                }
                                setEditFormData({ ...editFormData, daysPlaying: daysArr.join(',') });
                              }}
                            />
                            <span className="text-[12px] md:text-sm">{t(`${day}`)}</span>
                          </label>
                        ))}
                      </div>
                      <label htmlFor="startTime" className="text-[12px] text-gray-600 md:text-base">
                        {t('startTime')}
                      </label>
                      <input
                        type="time"
                        placeholder={t('startTime')}
                        value={editFormData.startTime}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, startTime: e.target.value })
                        }
                        className="p-1 border rounded"
                        required
                      />
                      <label htmlFor="endTime" className="text-[12px] text-gray-600 md:text-base">
                        {t('endTime')}
                      </label>
                      <input
                        type="time"
                        placeholder={t('endTime')}
                        value={editFormData.endTime}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, endTime: e.target.value })
                        }
                        className="p-1 border rounded"
                        required
                      />
                      <label htmlFor="pricePerGame" className="text-[12px] text-gray-600 md:text-base">
                        {t('perGame')}
                      </label>
                      <input
                        type="number"
                        placeholder={t('perGame')}
                        value={editFormData.pricePerGame}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, pricePerGame: e.target.value })
                        }
                        className="p-1 border rounded"
                        required
                      />
                      <label htmlFor="paymentBank" className="text-[12px] text-gray-600 md:text-base">
                        Payment Bank
                      </label>
                      <input
                        type="text"
                        placeholder="Payment Bank"
                        value={editFormData.paymentBank}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, paymentBank: e.target.value })
                        }
                        className="p-1 border rounded"
                      />
                      <label htmlFor="paymentAccountName" className="text-[12px] text-gray-600 md:text-base">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        placeholder="Account Holder Name"
                        value={editFormData.paymentAccountName}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, paymentAccountName: e.target.value })
                        }
                        className="p-1 border rounded"
                      />
                      <label htmlFor="paymentAccountNumber" className="text-[12px] text-gray-600 md:text-base">
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={editFormData.paymentAccountNumber}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, paymentAccountNumber: e.target.value })
                        }
                        className="p-1 border rounded"
                      />
                      <label htmlFor="editPaymentQR" className="text-[12px] text-gray-600 md:text-base">
                        Payment QR Code
                      </label>
                      <input
                        type="file"
                        name="editPaymentQR"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditFormData({ ...editFormData, paymentQrFileId: null });
                            setEditPaymentQrFile(file);
                            const preview = URL.createObjectURL(file);
                            setEditPaymentQrPreview(preview);
                          }
                        }}
                        className="p-1 border rounded"
                      />
                      {editPaymentQrPreview ? (
                        <div className="flex justify-center">
                          <img src={editPaymentQrPreview} alt="QR Preview" className="w-20 h-20 border rounded" />
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs md:text-sm">
                          No QR linked to this club yet.
                        </p>
                      )}
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>,
                document.body
              )}
          </>
        ) : (
          <>
            <div className="flex justify-center mt-10 px-4">
              <form
                ref={formRef2}
                onSubmit={handleUpdateName}
                className="flex flex-col gap-4 w-full max-w-md"
              >
                <h2 className="font-semibold text-lg text-center">{t('Update Name')}</h2>
                <input
                  type="text"
                  value={name}
                  placeholder={t("Enter your name")}
                  onChange={(e) => setName(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded-md text-white"
                >
                  {t('save')}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default Setting
