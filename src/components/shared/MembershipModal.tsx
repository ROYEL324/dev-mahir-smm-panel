import { Crown, Check, X, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function MembershipModal() {
  const {
    membershipModalOpen,
    setMembershipModalOpen,
    profile,
    firebaseUser,
    openAuthModal,
    setUserRoute,
  } = useApp();

  if (!membershipModalOpen) return null;

  const currentTier = profile?.membershipLevel || 'standard';

  const handleRequestUpgrade = () => {
    setMembershipModalOpen(false);
    if (!firebaseUser) {
      openAuthModal('login');
      return;
    }
    setUserRoute('support');
  };

  const tiers = [
    {
      name: 'Standard',
      id: 'standard',
      subtitle: 'Default account tier',
      perks: [
        'Full access to all public SMM services',
        'Real-time order tracking and wallet ledger',
        'Referral program participation',
      ],
    },
    {
      name: 'Premium',
      id: 'premium',
      subtitle: 'For agencies and high-volume creators',
      perks: [
        'Priority ticket routing in Support Center',
        'Faster order queue dispatch to providers',
        'Eligible for volume pricing agreements',
      ],
    },
    {
      name: 'VIP',
      id: 'vip',
      subtitle: 'Enterprise resellers and partners',
      perks: [
        'Dedicated account manager support',
        'Custom bulk service rate negotiation',
        'Highest priority refill and cancellation handling',
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-modal-title"
    >
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 sm:p-8 relative border border-violet-400/25 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={() => setMembershipModalOpen(false)}
          className="absolute top-4 right-4 text-violet-300/70 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Close membership dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="membership-modal-title" className="text-xl font-bold text-white">
              MAHIR DEV Membership Tiers
            </h2>
            <p className="text-xs text-violet-300/80">
              Current tier: <span className="text-sky-300 font-semibold capitalize">{currentTier}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const isActive = currentTier === tier.id;
            return (
              <div
                key={tier.id}
                className={`rounded-xl p-4 border flex flex-col justify-between ${
                  isActive
                    ? 'border-violet-400/60 bg-violet-600/15'
                    : 'border-violet-500/20 bg-[#0D0620]/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-white">{tier.name}</h3>
                    {isActive && (
                      <span className="text-xs font-semibold text-sky-300">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-violet-300/75 mb-4">{tier.subtitle}</p>
                  <ul className="space-y-2 mb-5">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-xs text-violet-100/90">
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isActive}
                  onClick={handleRequestUpgrade}
                  className={`w-full rounded-lg py-2 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-white/5 text-violet-300/60 cursor-default'
                      : 'neon-button-primary text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isActive ? 'Current Tier' : 'Request Upgrade'}</span>
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-xs text-violet-300/75 leading-relaxed">
          Membership upgrades are verified and activated by an authorized MAHIR DEV administrator after account review.
        </p>
      </div>
    </div>
  );
}
