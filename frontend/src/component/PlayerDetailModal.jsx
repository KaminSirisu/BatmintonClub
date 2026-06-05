import { Dialog, DialogPanel, DialogTitle, TransitionChild, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useLanguage } from '../utils/LanguageProvider.jsx';

export default function PlayerDetailModal({ isOpen, onClose, player, pricePerGame, startPrice }) {
  const { t } = useLanguage();
  if (!player) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="z-50 relative" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex justify-center items-center p-4 min-h-full text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="bg-white shadow-xl p-6 rounded-2xl w-full max-w-md overflow-hidden text-left align-middle transition-all transform">
                <DialogTitle className="font-medium text-gray-900 text-lg">
                  {player.name}
                </DialogTitle>
                <div className="space-y-2 mt-4 text-gray-700 text-base">
                  <p>{t('skill level')}: {player.skillLevel}</p>
                  <p>{t('gamesPlayed')}: {player.gamesPlayed}</p>
                  <p>{t('startPrice')}: {startPrice}</p>
                  <p>{t('perGame')}: {pricePerGame}</p>
                  <p>{t('total')}: 
                    {player.gamesPlayed === 0
                      ? 0
                      : startPrice + (player.gamesPlayed * pricePerGame)
                    }฿
                  </p>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center bg-blue-600 hover:bg-blue-700 px-4 py-2 border border-transparent rounded-md font-medium text-white text-sm"
                    onClick={onClose}
                  >
                    {t('close')}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
