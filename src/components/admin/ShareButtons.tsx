import { useState } from 'react';
import { Share2, Mail, Copy, Check, MessageCircle, Facebook, Twitter, Send } from 'lucide-react';

interface ShareButtonsProps {
  journeyId: string;
  journeyName: string;
  journeyDescription?: string;
  shareUrl?: string;
}

export function ShareButtons({ journeyId, journeyName, journeyDescription, shareUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const baseUrl = window.location.origin;
  const fullShareUrl = shareUrl || `${baseUrl}/shared/${journeyId}`;

  const shareText = `Check out this journey: ${journeyName}${journeyDescription ? `\n${journeyDescription}` : ''}`;
  const emailSubject = `Journey Itinerary: ${journeyName}`;
  const emailBody = `Hi,\n\nI'd like to share this journey itinerary with you:\n\n${journeyName}${journeyDescription ? `\n${journeyDescription}` : ''}\n\nView the full itinerary here: ${fullShareUrl}\n\nBest regards`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullShareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
  };

  const shareViaSMS = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(`${shareText}\n${fullShareUrl}`)}`;
    window.location.href = smsUrl;
  };

  const shareViaFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullShareUrl)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
  };

  const shareViaTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullShareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const useNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: journeyName,
          text: shareText,
          url: fullShareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors"
        title="Share journey"
      >
        <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Share via</h3>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  copyToClipboard();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600" />
                )}
                <span className="text-sm text-slate-700">
                  {copied ? 'Link copied!' : 'Copy link'}
                </span>
              </button>

              <button
                onClick={() => {
                  shareViaWhatsApp();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-slate-700">WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  shareViaEmail();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-700">Email</span>
              </button>

              <button
                onClick={() => {
                  shareViaSMS();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <Send className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700">SMS</span>
              </button>

              <button
                onClick={() => {
                  shareViaFacebook();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <Facebook className="w-4 h-4 text-blue-700" />
                <span className="text-sm text-slate-700">Facebook</span>
              </button>

              <button
                onClick={() => {
                  shareViaTwitter();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <Twitter className="w-4 h-4 text-sky-500" />
                <span className="text-sm text-slate-700">Twitter</span>
              </button>

              {navigator.share && (
                <button
                  onClick={() => {
                    useNativeShare();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <Share2 className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-700">More options...</span>
                </button>
              )}
            </div>

            <div className="px-4 py-2 border-t border-slate-200 mt-1">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded text-xs">
                <span className="text-slate-600 truncate flex-1">{fullShareUrl}</span>
                <button
                  onClick={copyToClipboard}
                  className="text-brand-orange hover:text-brand-orange-hover flex-shrink-0"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
