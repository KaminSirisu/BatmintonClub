import { useEffect, useState } from 'react';
import Navbar from '../component/Navbar.jsx';
import BottomNav from '../component/BottomNav.jsx';
import { useAuth } from '../utils/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Edit, Trash2, CalendarClockIcon, Clipboard } from 'lucide-react';
import { useLanguage } from '../utils/LanguageProvider.jsx';
import DragDropUpload from '../component/DragDropUpload.jsx';
import { toast } from 'react-hot-toast';

const Home = () => {
  const { t } = useLanguage();

  const { getAdminNameAcc, 
          getUserName, 
          getClubData, 
          getClubById,
          addPlayer, 
          getPlayers, 
          updatedPlayers, 
          deletePlayer, 
          createBooking,
          getCheckIn,
          getTodayBookings,
          completePendingCheckIn,
          uploadSlipToAppwrite,
          
        }  = useAuth();

 
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('All');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showUpdatePlayerModal, setShowUpdatePlayerModal] = useState(false);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingTime, setBookingTime] = useState('');
  const [bookedClubs, setBookedClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [checkInClub, setCheckInClub] = useState(null);
  const [pendingProfileDrafts, setPendingProfileDrafts] = useState({});
  const [completingCheckInId, setCompletingCheckInId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);


  const [showUploadSlipModal, setShowUploadSlipModal] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [uploadingSlipClub, setUploadingSlipClub] = useState(null);


  const [editingPlayer, setEditingPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [admin, setAdmin] = useState([]);
  const [club, setClub] = useState([]);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    skillLevel: 'VB',
    clubs: [],
  });


  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = skillFilter === 'All' || player.skillLevel === skillFilter;
    return matchesSearch && matchesSkill;
  });

  const addNewPlayer = async () => {
    const success = await addPlayer(newPlayer);
    if (success) {
      const updated = await getPlayers();
      setPlayers(updated);
      setShowAddPlayerModal(false);
      setNewPlayer({
        name: '',
        skillLevel: '',
        clubs: [],
      });
      // console.log("Result", updated);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;

    try {
        // Persist to Appwrite
        await updatedPlayers(editingPlayer.id, {
            name: editingPlayer.name,
            skillLevel: editingPlayer.skillLevel,
            club: editingPlayer.club, // ensure this matches your Appwrite field
        });

        // Update local state immediately
        setPlayers(prev =>
            prev.map(player =>
                player.id === editingPlayer.id ? editingPlayer : player
            )
        );

        setShowUpdatePlayerModal(false);
        console.log(`Player ${editingPlayer.id} updated successfully.`);
    } catch (error) {
        console.error("Failed to update player:", error);
    }
  }

  const togglePlayerClub = async (playerId, clubId) => {
    // Update local state immediately for instant toggle feedback
    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        if (player.id === playerId) {
          const isInClub = player.club?.includes(clubId);
          return {
            ...player,
            club: isInClub
              ? player.club.filter(id => id !== clubId)
              : [...player.club, clubId],
          };
        }
        return player;
      })
    );

    // Find the current player data
    const player = players.find(p => p.id === playerId);
    if (!player) {
      console.error("Player not found:", playerId);
      return;
    }

    // Compute the updated club list
    // If Player in the Club yet
    const isInClub = player.club?.includes(clubId);
    // True: Remove Club from Player, False: Add Club to Player
    const updatedClubList = isInClub
      ? player.club.filter(id => id !== clubId)
      : [...player.club, clubId];

    // Persist to Appwrite
    try {
      await updatedPlayers(playerId, {
        name: player.name,
        skillLevel: player.skillLevel,
        club: updatedClubList, // replace 'clubs' with 'club' if your DB field is 'club'
      });
      console.log(`Updated player ${playerId} clubs in Appwrite.`);
    } catch (error) {
      console.error("Error updating player clubs in Appwrite:", error);
    }
    
  };

  const getClubMemberCount = (clubId) => {
    return players.filter(player => player.club.includes(clubId)).length;
  };

  const generateTimeSlots = (startTime) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const slots = [];
    const date = new Date();

    date.setHours(hours, minutes, 0);

    for (let i = 0; i < 4; i++) {
      const slotTime = date.toTimeString().slice(0, 5);
      slots.push(slotTime);
      date.setMinutes(date.getMinutes() + 30);
    }

    return slots;
  }

  const handleBookingSubmit = async (playerName) => {
    if (!selectedClub || !bookingTime) return;

    try {
      await createBooking({
        playerName,
        clubId: selectedClub.id,
        bookingTime,
      });
      setShowBookingModal(false);
      setBookedClubs((prev) => [...prev, selectedClub.id]);
      setBookingTime("");
    } catch {
      alert(t('Failed to create booking.'));
    }
  };

  const handleOpenBookingsModal = async (club) => {
    setSelectedClub(club);
    setIsBookingsModalOpen(true);

    const bookingData = await getTodayBookings(club.id);
    setBookings(bookingData);
  }


  const handleLoadCheckIns = async (club) => {
    setCheckInClub(club);
    const checkInData = await getCheckIn(club);
    setCheckIns(checkInData);
  };

  const updatePendingProfileDraft = (checkInId, field, value) => {
    setPendingProfileDrafts((previous) => ({
      ...previous,
      [checkInId]: {
        revisedName: previous[checkInId]?.revisedName || '',
        skillLevel: previous[checkInId]?.skillLevel || 'VB',
        [field]: value,
      },
    }));
  };

  const handleCompletePendingCheckIn = async (checkIn) => {
    const draft = pendingProfileDrafts[checkIn.$id] || {};

    try {
      setCompletingCheckInId(checkIn.$id);
      const result = await completePendingCheckIn({
        checkIn,
        revisedName: draft.revisedName,
        skillLevel: draft.skillLevel || 'VB',
      });

      setCheckIns((previous) =>
        previous.map((item) => item.$id === checkIn.$id ? result.checkIn : item)
      );
      setPlayers(await getPlayers());
      setPendingProfileDrafts((previous) => {
        const next = { ...previous };
        delete next[checkIn.$id];
        return next;
      });
    } catch {
      // AuthContext displays the Appwrite error.
    } finally {
      setCompletingCheckInId(null);
    }
  };

  const handleOpenUploadSlipModal = async (clubData) => {
    const latestClubs = await getClubData();
    const latestClub =
      (await getClubById(clubData.id)) ||
      latestClubs.find((currentClub) => currentClub.id === clubData.id) ||
      clubData;

    setClub(latestClubs);
    setUploadingSlipClub(latestClub);
    setShowUploadSlipModal(true);
  };


  const IOSToggle = ({ isOn, onToggle, clubColor }) => (
    <div 
      className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors duration-1000 ease-in-out cursor-pointer ${
        isOn ? clubColor : 'bg-gray-200'
      }`}
      onClick={onToggle}
    >
      <div
        className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform will-change-transform rounded-full bg-white shadow-lg transition-transform duration-1000 ease-in-out ${
          isOn ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  );

  const bgColors = [
    'bg-blue-600',
    'bg-green-600',
    'bg-yellow-600',
    'bg-orange-600',
    'bg-red-600',
    'bg-pink-600',
    'bg-gray-600',
    'bg-indigo-600',
  ];

  const borderColors = [
    'border-blue-600',
    'border-green-600',
    'border-yellow-500',
    'border-orange-500',
    'border-red-600',
    'border-pink-600',
    'border-gray-600',
    'border-indigo-600',
  ]

  const textColors = [
    'text-blue-600',
    'text-green-600',
    'text-yellow-600',
    'text-orange-600',
    'text-red-600',
    'text-pink-600',
    'text-gray-600',
    'text-indigo-600',
  ]

  const getSkillLevelColor = (skill) => {
    switch(skill) {
      case 'VB': return 'bg-green-600 text-green-100';
      case 'BG': return 'bg-yellow-600 text-yellow-100';
      case 'N-': return 'bg-orange-600 text-orange-100';
      case 'N': return 'bg-red-600 text-red-100';
      case 'S': return 'bg-blue-600 text-blue-100';
      case 'P': return 'bg-purple-600 text-purple-100';
      default: return 'bg-gray-400 text-gray-100';
    }
  };

  useEffect(() => {
    const loadPlayers = async () => {
      const data = await getPlayers();
      setPlayers(data);
      
    };
    loadPlayers();
    
  }, [getPlayers]);


  useEffect(() => {
    const fetchData = async () => {
      const [name, admin] = await Promise.all([
        getUserName(),
        getAdminNameAcc()
      ]);
      setName(name);
      setAdmin(admin);
    };
    fetchData();
  }, [getAdminNameAcc, getUserName]);

  useEffect(() => {
    const fetchClubs = async () => {
      const data = await getClubData();
      setClub(data);
    };

    fetchClubs();
  }, [getClubData])


  return (
    <div className='flex flex-col bg-neutral-100 w-full min-h-screen overflow-auto'>
      <Navbar />
      <div className='flex-grow pb-24'>
        {/* Admin Site */}
        {admin.includes("admin") ? (
          <div className='px-4 sm:px-8 pt-4 sm:pt-6'>
            <h1 className='head-text'>
              {t('welcome')}, <b>{name}</b>
            </h1>
            <h2 className='mb-4 text-[11px] text-gray-500'>
              {t('manage your badminton clubs and players')}
            </h2>

            {/* Clubs List */}
            <div className="flex flex-col gap-3 mb-6">
              {club.map((club, index) => {
                const color = borderColors[index % borderColors.length];
                const colors = textColors[index % textColors.length];
                const colorss = bgColors[index % bgColors.length];
                return (
                  <div
                    key={club.id}
                    className={`bg-white px-3 py-3 sm:px-4 sm:py-4 rounded-2xl shadow-sm border-2 ${color} flex flex-col gap-1.5 sm:gap-2`}
                  >
                    {/* Top Row: Info + Action Buttons */}
                    <div className="flex justify-between items-start gap-2 sm:gap-3">
                      {/* Left: Club info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm sm:text-base md:text-lg ${colors} leading-tight`}>{club.clubName}</h3>
                        <p className="mt-0.5 text-gray-500 text-xs sm:text-sm">
                          {club.playingDay.split(',').map(day => t(day.trim())).join(', ')}
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm">{club.startTime}-{club.endTime}</p>
                      </div>
                      {/* Right: Buttons stacked */}
                      <div className="flex flex-col flex-shrink-0 items-end gap-1.5 sm:gap-2">
                        <Link
                          to={`/matchmaking/${club.id}`}
                          className={`${colorss} px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-semibold text-white text-xs sm:text-sm shadow-sm hover:opacity-90 transition`}
                        >
                          {t('matchmaking')}
                        </Link>
                        <Link
                          to={`/dashboard/${club.id}`}
                          className="flex justify-center items-center gap-1 bg-red-50 hover:bg-red-100 shadow-[0_0_18px_rgba(239,68,68,0.18)] px-3 sm:px-4 py-1.5 border border-red-100 rounded-xl font-medium text-red-600 text-xs sm:text-sm text-center transition"
                        >
                          <span className="inline-flex relative justify-center items-center w-3 h-3">
                            <span className="inline-flex absolute bg-red-400 opacity-75 rounded-full w-full h-full animate-ping" />
                            <span className="inline-flex relative bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.95)] rounded-full w-2 h-2" />
                          </span>
                          {t('MatchStatus')}
                        </Link>
                      </div>
                    </div>
                    {/* Bottom: Member count + daily actions */}
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center text-gray-600">
                        <Users className="mr-1 w-4 h-4" />
                        <span className="text-xs sm:text-sm">{getClubMemberCount(club.id)}</span>
                      </div>
                      <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-1">
                        <button
                          onClick={() => handleOpenBookingsModal(club)}
                          className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 sm:text-xs transition"
                        >
                          <CalendarClockIcon size={12} />
                          <span>{t("Today's bookings")}</span>
                        </button>
                        <button
                          onClick={() => handleLoadCheckIns(club)}
                          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 sm:text-xs transition"
                        >
                          <Users size={12} />
                          <span>{t("Today's Check-ins")}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
            
            {/* Booking Modal */}
            {isBookingsModalOpen && (
              <div className='z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4'>
                <div className='relative bg-white shadow-xl p-6 rounded-2xl w-full max-w-md'>
                  <div className='flex justify-between items-center mb-3'>
                    <div>
                      <h3 className='font-bold text-gray-800 text-xl'>{t("Today's bookings")}</h3>
                      <p className="mt-1 text-gray-500 text-sm">
                        {selectedClub?.clubName}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsBookingsModalOpen(false)}
                      className='text-gray-500 hover:text-gray-800 text-3xl transition'
                    >
                      x
                    </button>
                  </div>

                  <hr className="mb-3" />

                  {bookings.length > 0 ? (
                    <div className='space-y-2 max-h-72 overflow-y-auto'>
                      {bookings.map((booking) => (
                        <div
                          key={booking.$id}
                          className='flex justify-between items-center gap-3 p-3 border border-gray-200 rounded-xl'
                        >
                          <div>
                            <p className="font-semibold text-gray-800">
                              {booking.playerName || booking.lineDisplayName || t('LINE User')}
                            </p>
                            <p className="mt-1 text-gray-500 text-xs">
                              {t('Planned arrival')}: {booking.bookingTime}
                            </p>
                          </div>

                          <span
                            className={`px-2 py-1 rounded-full font-semibold text-xs ${
                              booking.status === 'checked_in'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {booking.status === 'checked_in' ? t('Checked in') : t('Booked')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-gray-500 text-center">
                      {t('No bookings yet for today')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Today's QR Check-ins */}
            <section className="mb-6">
              <div className="flex justify-between items-end gap-3 mb-3">
                <div>
                  <h2 className="font-bold text-gray-800 text-base">{t("Today's Check-ins")}</h2>
                  <p className="mt-0.5 text-gray-500 text-xs">
                    {checkInClub
                      ? `${checkInClub.clubName} · ${t('QR arrivals')}`
                      : t("Choose Today's Check-ins on a club card to load arrivals.")}
                  </p>
                </div>
                {checkInClub && (
                  <button
                    onClick={() => handleLoadCheckIns(checkInClub)}
                    className="font-semibold text-blue-600 hover:text-blue-700 text-xs transition"
                  >
                    {t('Refresh')}
                  </button>
                )}
              </div>

              <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-x-auto">
                {checkIns.length > 0 ? (
                  <table className="w-full min-w-[760px] text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2 sm:py-3">{t('time')}</th>
                        <th className="px-4 py-2 sm:py-3">{t('LINE name')}</th>
                        <th className="px-4 py-2 sm:py-3">{t('Player name')}</th>
                        <th className="px-4 py-2 sm:py-3">{t('Skill')}</th>
                        <th className="px-4 py-2 sm:py-3">{t('Status')}</th>
                        <th className="px-4 py-2 sm:py-3">{t('Action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {checkIns.map((checkIn) => {
                        const isPending = checkIn.status === 'pending_profile';
                        const draft = pendingProfileDrafts[checkIn.$id] || {};

                        return (
                          <tr key={checkIn.$id} className="align-top">
                            <td className="px-4 py-2 sm:py-3 font-semibold text-gray-700">
                              {checkIn.checkInTime}
                            </td>
                            <td className="px-4 py-2 sm:py-3 text-gray-700">
                              {checkIn.lineDisplayName || checkIn.name}
                            </td>
                            <td className="px-4 py-2 sm:py-3">
                              {isPending ? (
                                <input
                                  type="text"
                                  value={draft.revisedName || ''}
                                  onChange={(event) =>
                                    updatePendingProfileDraft(checkIn.$id, 'revisedName', event.target.value)
                                  }
                                  placeholder={t('enter player name')}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full min-w-40"
                                />
                              ) : (
                                <span className="font-semibold text-gray-800">{checkIn.name}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 sm:py-3">
                              {isPending ? (
                                <select
                                  value={draft.skillLevel || 'VB'}
                                  onChange={(event) =>
                                    updatePendingProfileDraft(checkIn.$id, 'skillLevel', event.target.value)
                                  }
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="VB">VB</option>
                                  <option value="BG">BG</option>
                                  <option value="N-">N-</option>
                                  <option value="N">N</option>
                                  <option value="S">S</option>
                                  <option value="P">P</option>
                                </select>
                              ) : (
                                <span className="font-semibold text-gray-700">
                                  {checkIn.skillLevel || '-'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 sm:py-3">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full font-semibold text-xs ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isPending ? t('Setup needed') : t('Ready')}
                              </span>
                            </td>
                            <td className="px-4 py-2 sm:py-3">
                              {isPending ? (
                                <button
                                  onClick={() => handleCompletePendingCheckIn(checkIn)}
                                  disabled={completingCheckInId === checkIn.$id}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 px-3 py-2 rounded-lg font-semibold text-white text-xs transition"
                                >
                                  {completingCheckInId === checkIn.$id ? t('Saving...') : t('addPlayer')}
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">{t('Linked player')}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-4 py-8 text-gray-500 text-sm text-center">
                    {checkInClub
                      ? t('No check-ins yet for today')
                      : t('No club selected')}
                  </p>
                )}
              </div>
            </section>

            {/* Player Section Header */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800 text-base">{t('players')}</h2>
              <button
                onClick={() => setShowAddPlayerModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm px-3 py-2 rounded-xl font-semibold text-white text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('add player')}
              </button>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t('search players...')}
                  className="bg-white py-2 pr-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="bg-white px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
              >
                <option value="All">{t('all')}</option>
                <option value="VB">VB</option>
                <option value="BG">BG</option>
                <option value="N-">N-</option>
                <option value="N">N</option>
                <option value="S">S</option>
                <option value="P">P</option>
              </select>
            </div>

            {/* Player count */}
            <p className="mb-2 text-gray-500 text-sm">
              {filteredPlayers.length} of {players.length} {t('players')}
            </p>

            {/* Add Player Modal */}
            {showAddPlayerModal && (
              <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-md">
                  <h3 className="mb-4 font-semibold text-lg">{t('add new player')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1 font-medium text-gray-700 text-sm">{t('name')}</label>
                      <input
                        type="text"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        value={newPlayer.name}
                        onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                        placeholder={t("enter player name")}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-gray-700 text-sm">{t('skill level')}</label>
                      <select
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        value={newPlayer.skillLevel}
                        onChange={(e) => setNewPlayer({...newPlayer, skillLevel: e.target.value})}
                      >
                        <option value="VB">VB</option>
                        <option value="BG">BG</option>
                        <option value="N-">N-</option>
                        <option value="N">N</option>
                        <option value="S">S</option>
                        <option value="P">P</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-gray-700 text-sm">{t('playing club')}</label>
                      <div className="space-y-2">
                        {club.map(club => (
                          <label key={club.id} className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={newPlayer.clubs.includes(club.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewPlayer({
                                    ...newPlayer,
                                    clubs: [...newPlayer.clubs, club.id]
                                  });
                                } else {
                                  setNewPlayer({
                                    ...newPlayer,
                                    clubs: newPlayer.clubs.filter(id => id !== club.id)
                                  });
                                }
                              }}
                            />
                            <span className={`w-3 h-3 rounded-full bg-blue-500 mr-2`}></span>
                            {club.clubName}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowAddPlayerModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={addNewPlayer}
                      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      {t('addPlayer')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Players List */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
              {filteredPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 ${
                    index < filteredPlayers.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Skill Badge */}
                  <div
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold flex-shrink-0 ${getSkillLevelColor(player.skillLevel)}`}
                  >
                    {player.skillLevel}
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0 font-medium text-gray-800 text-xs sm:text-sm truncate">{player.name}</div>
                  {/* Club Toggles */}
                  <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                    {club.map((clubItem, cIndex) => {
                      const color = bgColors[cIndex % bgColors.length];
                      return (
                        <IOSToggle
                          key={clubItem.id}
                          isOn={player.club.includes(clubItem.id)}
                          onToggle={() => togglePlayerClub(player.id, clubItem.id)}
                          clubColor={color}
                        />
                      );
                    })}
                  </div>
                  {/* Edit */}
                  <button
                    className="flex-shrink-0 p-0.5 sm:p-1 text-blue-500 text-sm sm:text-base transition-colors"
                    onClick={() => { setEditingPlayer(player); setShowUpdatePlayerModal(true); }}
                  >
                    <Edit className='w-4 h-4'/>
                  </button>
                  {/* Delete */}
                  <button
                    className="flex-shrink-0 p-0.5 sm:p-1 text-red-500 text-sm sm:text-base transition-colors"
                    onClick={async () => {
                      if (window.confirm(t("Are you sure you want to delete this player?"))) {
                        await deletePlayer(player.id, async () => {
                          const updated = await getPlayers();
                          setPlayers(updated);
                        });
                      }
                    }}
                  >
                    <Trash2 className='w-4 h-4'/>
                  </button>
                </div>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="py-10 text-gray-400 text-sm text-center">{t('No players found')}</div>
              )}
            </div>

            {/* Update Player Modal */}
            {showUpdatePlayerModal && (
              <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-md">
                  <h3 className="mb-4 font-semibold text-lg">{t('editPlayer')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1 font-medium text-gray-700 text-sm">{t('name')}</label>
                      <input
                        type="text"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        value={editingPlayer.name}
                        onChange={(e) => setEditingPlayer({...editingPlayer, name: e.target.value})}
                        placeholder={t('enter player name')}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-gray-700 text-sm">{t('skill level')}</label>
                      <select
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        value={editingPlayer.skillLevel}
                        onChange={(e) => setEditingPlayer({...editingPlayer, skillLevel: e.target.value})}
                      >
                        <option value="VB">VB</option>
                        <option value="BG">BG</option>
                        <option value="N-">N-</option>
                        <option value="N">N</option>
                        <option value="S">S</option>
                        <option value="P">P</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowUpdatePlayerModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdatePlayer}
                      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // User Site
          <div className='px-4 sm:px-8 pt-4 sm:pt-6'>
            <h1 className='head-text'>{t('welcome')}, <b>{name}</b></h1>
            <h2 className='mb-4 text-[11px] text-gray-500'>{t('Check in the game — your club is waiting.')}</h2>

            {/* Clubs List */}
            <div className="flex flex-col gap-3">
              {club.map((club, index) => {
                const color = borderColors[index % borderColors.length];
                const colors = textColors[index % textColors.length];
                const colorss = bgColors[index % bgColors.length];
                return (
                  <div
                    key={club.id}
                    className={`bg-white px-3 py-3 sm:px-4 sm:py-4 rounded-2xl shadow-sm border-2 ${color} flex flex-col gap-1.5 sm:gap-2`}
                  >
                    {/* Top Row: Info + Action Buttons */}
                    <div className="flex justify-between items-start gap-2 sm:gap-3">
                      {/* Left: Club info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm sm:text-base md:text-lg ${colors} leading-tight`}>{club.clubName}</h3>
                        <p className="mt-0.5 text-gray-500 text-xs sm:text-sm">
                          {club.playingDay.split(',').map(day => t(day.trim())).join(', ')}
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm">{club.startTime}-{club.endTime}</p>
                      </div>
                      {/* Right: Buttons stacked */}
                      <div className="flex flex-col flex-shrink-0 items-end gap-1.5 sm:gap-2">
                        {bookedClubs.includes(club.id) ? (
                          <span className="font-semibold text-green-600 text-xs sm:text-sm">✓ Booked</span>
                        ) : (
                          <button
                            onClick={() => { setSelectedClub(club); setShowBookingModal(true); }}
                            className={`${colorss} px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-semibold text-white text-xs sm:text-sm shadow-sm flex items-center gap-1 hover:opacity-90 transition`}
                          >
                            <CalendarClockIcon size={13} />
                            {t('Booking')}
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenUploadSlipModal(club)}
                          className="flex items-center gap-1 bg-white hover:bg-gray-50 px-3 sm:px-4 py-1.5 border border-gray-200 rounded-xl font-medium text-gray-600 text-xs sm:text-sm transition"
                        >
                          <Clipboard size={13} />
                          {t('money slip')}
                        </button>
                      </div>
                    </div>
                    {/* Bottom: Member count */}
                    <div className="flex items-center text-gray-600">
                      <Users className="mr-1 w-4 h-4" />
                      <span className="text-xs sm:text-sm">{getClubMemberCount(club.id)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Booking Modal */}
            {showBookingModal && selectedClub && (
              <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-md">
                  <h3 className="mb-1 font-semibold text-lg">{t('Booking')}</h3>
                  <p className="mb-4 text-gray-500 text-sm">
                    {t('Choose the time you plan to arrive at')} {selectedClub.clubName}.
                  </p>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                  >
                    <option value="">{t('Select time')}</option>
                    {generateTimeSlots(selectedClub.startTime).map((time, index) => (
                      <option key={index} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        setBookingTime("");
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={() => handleBookingSubmit(name)}
                      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      {t('save')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showUploadSlipModal && uploadingSlipClub && (
              <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <h3 className="mb-4 font-semibold text-lg">
                    {t('Upload Slip')} — <span className="text-blue-600">{uploadingSlipClub.clubName}</span>
                  </h3>
                  
                  {/* Payment Info Section */}
                  {(uploadingSlipClub.paymentBank || uploadingSlipClub.paymentAccountName || uploadingSlipClub.paymentAccountNumber || uploadingSlipClub.paymentQrDisplayUrl || uploadingSlipClub.paymentQrPreviewUrl || uploadingSlipClub.paymentQrDownloadUrl) ? (
                    <div className="bg-blue-50 mb-6 p-4 border border-blue-200 rounded-lg">
                      <h4 className="mb-3 font-semibold text-blue-900">{t('Payment Details')}</h4>
                      
                      {(uploadingSlipClub.paymentQrDisplayUrl || uploadingSlipClub.paymentQrDownloadUrl || uploadingSlipClub.paymentQrPreviewUrl) ? (
                        <div className="flex justify-center mb-4">
                          <img 
                            src={uploadingSlipClub.paymentQrDisplayUrl || uploadingSlipClub.paymentQrDownloadUrl || uploadingSlipClub.paymentQrPreviewUrl} 
                            alt={t('Payment QR Code')}
                            className="border-2 border-blue-300 rounded w-40 h-40"
                          />
                        </div>
                      ) : (
                        <p className="mb-4 text-gray-600 text-sm text-center">
                          {t("No QR linked to this club yet")}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        {uploadingSlipClub.paymentBank && (
                          <p><span className="font-semibold text-gray-700">{t('Bank')}:</span> <span className="text-gray-900">{uploadingSlipClub.paymentBank}</span></p>
                        )}
                        {uploadingSlipClub.paymentAccountName && (
                          <p><span className="font-semibold text-gray-700">{t('Account Name')}:</span> <span className="text-gray-900">{uploadingSlipClub.paymentAccountName}</span></p>
                        )}
                        {uploadingSlipClub.paymentAccountNumber && (
                          <p><span className="font-semibold text-gray-700">{t('Account Number')}:</span> <span className="text-gray-900">{uploadingSlipClub.paymentAccountNumber}</span></p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 mb-6 p-4 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 text-sm text-center">
                        {t("No payment details added for this club yet")}
                      </p>
                    </div>
                  )}
                  
                  {/* ⬇️ Drag-and-drop file input */}
                  <DragDropUpload
                    onFileSelected={(file) => setSlipFile(file)}
                  />
                  {/* Action buttons */}
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => {
                        setShowUploadSlipModal(false);
                        setSlipFile(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={async () => {
                        if (!slipFile) return toast.error(t("Please upload a file"));
                        try {
                          await uploadSlipToAppwrite({
                            file: slipFile,
                            clubId: uploadingSlipClub.id,
                            userName: name,
                          });
                          toast.success(t("Slip uploaded successfully"));
                          setShowUploadSlipModal(false);
                          setSlipFile(null);
                        } catch (error) {
                          toast.error(t("Upload failed"));
                          console.error(error);
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white transition"
                    >
                      {t('upload')}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )

}

export default Home
