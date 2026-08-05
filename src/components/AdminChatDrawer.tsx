import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Trash2, 
  Search, 
  Check, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Plus, 
  AtSign,
  Pencil,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileCode,
  File,
  GripHorizontal,
  ChevronDown,
  Reply,
  Eye,
  Star,
  Pin,
  PinOff,
  ArrowRight,
  Clock,
  MessageSquare,
  AlertCircle,
  Camera,
  RotateCcw,
  RefreshCw,
  Smile
} from 'lucide-react';
import { 
  fetchTableData, 
  insertTableRow, 
  updateTableRow,
  deleteTableRow, 
  subscribeRealtimeChanges, 
  sendRealtimeWSMessage, 
  safeLocalStorageSetItem,
  uploadFileToStorage
} from '../lib/api';

export interface ChatAttachment {
  name: string;
  url: string;
  type: 'file' | 'image';
  fileType?: string; // pdf, word, excel, image, generic
  size?: number; // size in bytes
  isCompressed?: boolean;
}

export interface ChatReplyTo {
  id: string;
  sender_name: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  sender_username?: string;
  sender_name?: string;
  sender_role?: string;
  sender?: string;
  senderRole?: string;
  sender_avatar?: string;
  senderAvatar?: string;
  recipient_role?: string;
  channel?: string;
  message?: string;
  text?: string;
  attachment?: ChatAttachment;
  reply_to?: ChatReplyTo;
  replyTo?: any;
  is_edited?: boolean;
  edited_at?: string;
  is_system_notice?: boolean;
  created_at: string;
  timestamp?: string;
}

export interface PinnedItem {
  id: string;
  pinnedAt: string;
  expiresAt: number | null;
  durationText: string;
  pinnedBy: string;
}

interface AdminChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onClearUnread: () => void;
}

const LOCAL_STORAGE_KEY = 'smartsantri_admin_chat_messages';

// Mention suggestions for @
const ADMIN_MENTIONS = [
  // Role / Rule Channels (Cleaned - no dummy names or sub-descriptions)
  { type: 'role', id: 'superadmin', display: '@superadmin', role: 'Superadmin' },
  { type: 'role', id: 'sekretarisputra', display: '@sekretarisputra', role: 'Sekretaris Putra' },
  { type: 'role', id: 'sekretarisputri', display: '@sekretarisputri', role: 'Sekretaris Putri' },
  { type: 'role', id: 'bendaharaputra', display: '@bendaharaputra', role: 'Bendahara Putra' },
  { type: 'role', id: 'bendaharaputri', display: '@bendaharaputri', role: 'Bendahara Putri' },
  { type: 'role', id: 'keamananputra', display: '@keamananputra', role: 'Keamanan Putra' },
  { type: 'role', id: 'keamananputri', display: '@keamananputri', role: 'Keamanan Putri' },
  { type: 'role', id: 'humasputra', display: '@humasputra', role: 'Humas Putra' },
  { type: 'role', id: 'humasputri', display: '@humasputri', role: 'Humas Putri' },
  { type: 'role', id: 'pendidikan', display: '@pendidikan', role: 'Pendidikan' },
  { type: 'role', id: 'pengurus', display: '@pengurus', role: 'Pengurus' }
];

// WhatsApp Style Emoji Picker Categories & Data
const EMOJI_CATEGORIES = [
  {
    id: 'recents',
    name: 'Terbaru',
    emojis: ['😂', '😍', '😊', '🙏', '👍', '❤️', '🔥', '🤣', '😭', '🥰', '✨', '🏼', '🏽', '🏾', '🏿']
  },
  {
    id: 'smileys',
    name: 'Smiley & Orang',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '☺️', '😊', '😇', '🙂', '🙃', '😉',
      '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
      '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺',
      '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
      '🤔', '🫣', '🤭', '🤫', '🫡', '🤥', '😶', '😐', '😑', '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧',
      '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
      '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃',
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟',
      '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
      '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
      '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦', '💋'
    ]
  },
  {
    id: 'animals',
    name: 'Hewan & Alam',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
      '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
      '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️',
      '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
      '🐋', '🦈', '🦭', '🐊', '🐅', '🐆', 'zebra', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘',
      '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓',
      '🌸', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁'
    ]
  },
  {
    id: 'food',
    name: 'Makanan & Minuman',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
      '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜',
      '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕',
      '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈',
      '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠',
      '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛',
      '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊'
    ]
  },
  {
    id: 'activities',
    name: 'Aktivitas & Objek',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
      '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
      '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🚗', '🚕', '🚙',
      '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️', '💽', '💾', '💿', '📀', '🎥', '🎬', '📽️', '📷',
      '📸', '📹', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '💡', 'flashlight', '🕯️'
    ]
  },
  {
    id: 'symbols',
    name: 'Simbol & Hati',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '<ctrl42>',
      '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️',
      '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘',
      '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭',
      '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '❇️',
      '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '⭐'
    ]
  }
];

export default function AdminChatDrawer({
  isOpen,
  onClose,
  unreadCount,
  onClearUnread
}: AdminChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'media'>('chat');
  const [layoutMode, setLayoutMode] = useState<'sidebar' | 'floating' | 'full'>('floating');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showHideTooltip, setShowHideTooltip] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Attachment Menu & Pending Attachment State
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Edit & Reply State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<ChatMessage | null>(null);
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; name: string } | null>(null);
  const msgMenuRef = useRef<HTMLDivElement>(null);

  // Media Selection, Star & Action Panel State
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [starredMediaIds, setStarredMediaIds] = useState<string[]>([]);
  const [filterOnlyStarred, setFilterOnlyStarred] = useState<boolean>(false);
  const [showDeleteMediaModal, setShowDeleteMediaModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pinned Messages State
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>(() => {
    try {
      const saved = localStorage.getItem('smartsantri_admin_chat_pinned_meta');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [pinnedMsgIds, setPinnedMsgIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smartsantri_admin_chat_pinned');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [pinDurationModalMsgId, setPinDurationModalMsgId] = useState<string | null>(null);
  const [selectedPinDuration, setSelectedPinDuration] = useState<'24h' | '7d' | '30d'>('7d');
  const [activePinnedIndex, setActivePinnedIndex] = useState<number>(0);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState<boolean>(false);
  const pinnedDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    safeLocalStorageSetItem('smartsantri_admin_chat_pinned', JSON.stringify(pinnedMsgIds));
  }, [pinnedMsgIds]);

  useEffect(() => {
    safeLocalStorageSetItem('smartsantri_admin_chat_pinned_meta', JSON.stringify(pinnedItems));
  }, [pinnedItems]);

  // Click outside to close pinned message dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pinnedDropdownRef.current && !pinnedDropdownRef.current.contains(e.target as Node)) {
        setShowPinnedDropdown(false);
      }
    };
    if (showPinnedDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPinnedDropdown]);

  // Cleanup expired pinned messages
  useEffect(() => {
    const now = Date.now();
    const validItems = pinnedItems.filter((item) => !item.expiresAt || item.expiresAt > now);
    if (validItems.length !== pinnedItems.length) {
      setPinnedItems(validItems);
      const validIds = validItems.map((v) => v.id);
      setPinnedMsgIds(validIds);
    }
  }, []);

  // Helper to insert center-aligned System Notice message into chat stream
  const createSystemNotice = (noticeText: string) => {
    const nowIso = new Date().toISOString();
    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender_username: 'system',
      sender_name: 'System',
      sender_role: 'system',
      sender: 'system',
      message: noticeText,
      text: noticeText,
      is_system_notice: true,
      created_at: nowIso,
      timestamp: nowIso
    };

    setMessages((prev) => {
      const updated = [...prev, sysMsg];
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    sendRealtimeWSMessage({
      type: 'admin_chat_message',
      message: sysMsg
    });

    try {
      insertTableRow('admin_chat', LOCAL_STORAGE_KEY, sysMsg);
    } catch (e) {
      console.warn('Gagal menyimpan system notice:', e);
    }
  };

  // Request Pin/Unpin action from message options menu
  const handleRequestPinMessage = (msgId: string | number) => {
    const idStr = String(msgId);
    const isPinned = pinnedMsgIds.map(String).includes(idStr);
    if (isPinned) {
      // Unpin immediately
      setPinnedMsgIds((prev) => prev.filter((id) => String(id) !== idStr));
      setPinnedItems((prev) => prev.filter((item) => String(item.id) !== idStr));

      const sysNoticeText = (currentUsername && currentUsername.includes('@'))
        ? `${currentUsername} melepas sematan pesan.`
        : (currentDisplayName && currentDisplayName !== 'Admin')
          ? `${currentDisplayName} melepas sematan pesan.`
          : 'Anda melepas sematan pesan.';

      createSystemNotice(sysNoticeText);
      showToast('Sematkan pesan dilepas');
    } else {
      if (pinnedMsgIds.length >= 3) {
        showToast('Maksimal 3 pesan disematkan. Lepas sematan lain terlebih dahulu.');
        return;
      }
      setPinDurationModalMsgId(idStr);
    }
    setActiveMsgMenuId(null);
  };

  // Confirm pin with duration from popup modal
  const handleConfirmPinWithDuration = () => {
    if (!pinDurationModalMsgId) return;

    let durationMs = 7 * 24 * 3600 * 1000;
    let durationText = '7 hari';
    if (selectedPinDuration === '24h') {
      durationMs = 24 * 3600 * 1000;
      durationText = '24 jam';
    } else if (selectedPinDuration === '30d') {
      durationMs = 30 * 24 * 3600 * 1000;
      durationText = '30 hari';
    }

    const expiresAt = Date.now() + durationMs;
    const userIdentifier = currentUsername || currentDisplayName || 'Anda';

    const newItem: PinnedItem = {
      id: pinDurationModalMsgId,
      pinnedAt: new Date().toISOString(),
      expiresAt,
      durationText,
      pinnedBy: userIdentifier
    };

    setPinnedItems((prev) => [...prev.filter((p) => p.id !== pinDurationModalMsgId), newItem]);
    setPinnedMsgIds((prev) => [...prev.filter((id) => id !== pinDurationModalMsgId), pinDurationModalMsgId]);

    const sysNoticeText = (currentUsername && currentUsername.includes('@'))
      ? `${currentUsername} menyematkan pesan.`
      : (currentDisplayName && currentDisplayName !== 'Admin')
        ? `${currentDisplayName} menyematkan pesan.`
        : 'Anda menyematkan pesan.';

    createSystemNotice(sysNoticeText);
    showToast(`Pesan disematkan selama ${durationText} 📌`);
    setPinDurationModalMsgId(null);
  };

  const handleTogglePinMessage = (msgId: string) => {
    handleRequestPinMessage(msgId);
  };

  // Unselect media and cancel selection mode when switching to Chat tab or closing modal
  useEffect(() => {
    if (activeTab === 'chat' || !isOpen) {
      setSelectedMediaId(null);
      setSelectedMediaIds([]);
    }
  }, [activeTab, isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handlePreviewMedia = (m: ChatMessage) => {
    const att = m.attachment;
    if (!att) return;
    const fileName = att.name || 'File';
    const isImage = att.type === 'image' || att.fileType === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
    if (isImage) {
      setPreviewImageModal({ url: att.url, name: fileName });
    } else {
      showToast('Tidak bisa preview file ini, hanya preview gambar yang didukung');
    }
  };

  const handleShowInChat = (msgId: string) => {
    setActiveTab('chat');
    setTimeout(() => {
      scrollToMsg(msgId);
    }, 120);
  };

  const handleDownloadImage = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'foto_chat.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Floating Width, Position & Drag State (Supports Left & Right Resizers + Header Window Drag)
  const [floatingWidth, setFloatingWidth] = useState<number>(460);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [positionX, setPositionX] = useState<number>(0);
  const [isDraggingWindow, setIsDraggingWindow] = useState<boolean>(false);

  const isResizingRef = useRef<boolean>(false);
  const isDraggingWindowRef = useRef<boolean>(false);
  const floatingWidthRef = useRef<number>(460);
  const positionXRef = useRef<number>(0);

  useEffect(() => {
    floatingWidthRef.current = floatingWidth;
  }, [floatingWidth]);

  useEffect(() => {
    positionXRef.current = positionX;
  }, [positionX]);

  const dragStateRef = useRef<{
    type: 'resize_left' | 'resize_right' | 'window';
    startX: number;
    startWidth: number;
    startPosX: number;
  }>({ type: 'window', startX: 0, startWidth: 460, startPosX: 0 });

  // Fast Exit Animation State
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  // @ Mention Suggestion State
  const [showMentionMenu, setShowMentionMenu] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [userMentionsList, setUserMentionsList] = useState<any[]>(ADMIN_MENTIONS);

  // Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [emojiSearch, setEmojiSearch] = useState<string>('');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>('recents');
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Dynamic Auto Resize Textarea (Up to max 7 lines ~160px height, then scrollable)
  const autoResizeTextarea = () => {
    if (inputRef.current) {
      const el = inputRef.current;
      el.style.height = 'auto';
      const maxHeight = 160; // Max height for 7 lines
      const newHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${newHeight}px`;
      if (el.scrollHeight >= maxHeight) {
        el.style.overflowY = 'auto';
      } else {
        el.style.overflowY = 'hidden';
      }
    }
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [inputText]);

  const getRecentEmojis = (): string[] => {
    try {
      const stored = localStorage.getItem('smartsantri_recent_emojis');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ['😂', '😍', '😊', '🙏', '👍', '❤️', '🔥', '🤣', '😭', '🥰', '✨', '🏼', '🏽', '🏾', '🏿'];
  };

  const handleInsertEmoji = (emoji: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || inputText.length;
      const end = inputRef.current.selectionEnd || inputText.length;
      const newText = inputText.substring(0, start) + emoji + inputText.substring(end);
      setInputText(newText);
      
      try {
        const recentsKey = 'smartsantri_recent_emojis';
        const stored = localStorage.getItem(recentsKey);
        let list: string[] = stored ? JSON.parse(stored) : getRecentEmojis();
        list = [emoji, ...list.filter(e => e !== emoji)].slice(0, 20);
        localStorage.setItem(recentsKey, JSON.stringify(list));
      } catch (e) {}

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPos = start + emoji.length;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 10);
    } else {
      setInputText(prev => prev + emoji);
    }
  };

  const rawFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);

  // Camera Modal & Capture State
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Scroll to Bottom Floating Button State & Unread Below Count
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleChatScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const isFarFromBottom = distanceFromBottom > 100;
      setShowScrollBottomBtn(isFarFromBottom);

      if (isFarFromBottom) {
        const containerBottom = scrollTop + clientHeight;
        const msgElements = scrollContainerRef.current.querySelectorAll('[id^="msg-"]');
        let countBelow = 0;
        msgElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.offsetTop > containerBottom - 40) {
            countBelow++;
          }
        });
        setUnreadBelowCount(countBelow);
      } else {
        setUnreadBelowCount(0);
      }
    }
  };

  const jumpToOldestUnreadOrBottom = (msgsList?: ChatMessage[]) => {
    const list = msgsList || messages;
    if (!scrollContainerRef.current || list.length === 0) return;

    const lastRead = localStorage.getItem('smartsantri_admin_chat_last_read_time');
    const myUname = (localStorage.getItem('smartsantri_active_username') || '').trim().toLowerCase();

    let targetMsgId: string | null = null;

    if (lastRead) {
      const oldestUnread = list.find(m => {
        const sender = (m.sender_username || m.sender || '').trim().toLowerCase();
        const isOther = sender ? sender !== myUname : true;
        const createdAtTime = m.created_at ? new Date(m.created_at).getTime() : 0;
        const lastReadTime = new Date(lastRead).getTime();
        return isOther && createdAtTime > lastReadTime;
      });
      if (oldestUnread) {
        targetMsgId = oldestUnread.id;
      }
    }

    if (targetMsgId) {
      const targetElement = document.getElementById(`msg-${targetMsgId}`);
      if (targetElement && scrollContainerRef.current) {
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const targetOffset = elementRect.top - containerRect.top + scrollContainerRef.current.scrollTop - 24;
        scrollContainerRef.current.scrollTop = Math.max(0, targetOffset);
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    } else {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }

    // Update last read timestamp to the newest message
    const latestMsg = list[list.length - 1];
    if (latestMsg && latestMsg.created_at) {
      localStorage.setItem('smartsantri_admin_chat_last_read_time', latestMsg.created_at);
    }
  };

  // Active User Info
  const currentUsername = localStorage.getItem('smartsantri_active_username') || '';
  const currentDisplayName = localStorage.getItem('smartsantri_active_display_name') || 'Admin';
  const currentRole = localStorage.getItem('smartsantri_active_role') || 'admin';

  // Helper to normalize message structure from DB / WebSocket / LocalStorage
  const normalizeChatMessage = (msg: any): ChatMessage => {
    if (!msg) return msg;

    let attachment = msg.attachment;
    if (typeof attachment === 'string') {
      try {
        attachment = JSON.parse(attachment);
      } catch (e) {
        attachment = undefined;
      }
    }

    let reply_to = msg.reply_to || msg.replyTo;
    if (typeof reply_to === 'string') {
      try {
        reply_to = JSON.parse(reply_to);
      } catch (e) {
        reply_to = undefined;
      }
    }

    const senderUsername = msg.sender_username || msg.sender || '';
    const senderName = msg.sender_name || (msg.sender && !msg.sender.includes('@') ? msg.sender : '') || msg.sender || 'Admin';
    const senderRole = msg.sender_role || msg.senderRole || 'Admin';
    const messageText = msg.message || msg.text || '';
    const createdAt = msg.created_at || msg.timestamp || new Date().toISOString();
    const avatar = msg.sender_avatar || msg.senderAvatar || undefined;

    return {
      ...msg,
      id: String(msg.id || Date.now()),
      sender_username: senderUsername,
      sender_name: senderName,
      sender_role: senderRole,
      sender_avatar: avatar,
      recipient_role: msg.recipient_role || msg.channel || 'semua',
      message: messageText,
      created_at: createdAt,
      attachment,
      reply_to
    };
  };

  useEffect(() => {
    loadChatMessages();
    loadUserMentions();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUserMentions();
      onClearUnread();
      setTimeout(() => {
        jumpToOldestUnreadOrBottom();
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Dynamic user accounts loader for @ mention suggestions
  const loadUserMentions = async () => {
    try {
      const local = localStorage.getItem('smartsantri_app_credentials');
      let creds: any[] = local ? JSON.parse(local) : [];

      const remoteData = await fetchTableData<any>('app_credentials', 'smartsantri_app_credentials', creds);
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        creds = remoteData;
      }

      // Default registered accounts (including screenshot accounts)
      const defaultAccounts = [
        { username: 'david@attaroqqy.com', name: 'David', role: 'Sekretaris Putra' },
        { username: 'aniq@attaroqqy.com', name: 'Aniq', role: 'Humas/Humasy Putra' },
        { username: 'daud@attaroqqy', name: 'Daud', role: 'Sekretaris Putra' },
        { username: 'mbahnapex@attaroqqy.com', name: 'Mbah Napex', role: 'Humas/Humasy Putra' },
        { username: 'qowam@attaroqqy.com', name: 'Qowam', role: 'Pengurus' },
        { username: 'aniq2@attaroqqy.com', name: 'Aniq 2', role: 'Humas' },
        { username: 'najih@attaroqqy.com', name: 'Najih', role: 'Pengurus' },
        { username: 'sekretaris@attaroqqy.com', name: 'Sekretaris Attaroqqy', role: 'Sekretaris' },
        { username: 'bendahara@attaroqqy.com', name: 'Bendahara Attaroqqy', role: 'Bendahara' },
        { username: 'admin@attaroqqy.com', name: 'Superadmin Attaroqqy', role: 'Superadmin' }
      ];

      const mentionMap = new Map<string, any>();

      // 1. Standard Role Channels
      ADMIN_MENTIONS.forEach(m => mentionMap.set(m.id, m));

      // Helper to insert account mentions
      const addAccountMention = (username: string, name?: string, role?: string) => {
        if (!username) return;
        const uname = username.trim().toLowerCase();
        const prefix = uname.split('@')[0];
        const roleStr = role || 'Pengurus';
        const nameStr = name || prefix;

        // Full Email Mention e.g. @david@attaroqqy.com
        mentionMap.set(`full_${uname}`, {
          type: 'user',
          id: uname,
          display: `@${uname}`,
          name: nameStr,
          email: uname,
          role: roleStr
        });

        // Short Mention e.g. @david, @aniq, @daud, @mbahnapex
        if (prefix && prefix !== uname) {
          mentionMap.set(`short_${prefix}`, {
            type: 'user',
            id: prefix,
            display: `@${prefix}`,
            name: `${nameStr} (@${prefix})`,
            email: uname,
            role: roleStr
          });
        }
      };

      // 2. Add default accounts
      defaultAccounts.forEach(acc => addAccountMention(acc.username, acc.name, acc.role));

      // 3. Add dynamic accounts from app_credentials
      if (Array.isArray(creds)) {
        creds.forEach(c => {
          if (c.username) {
            addAccountMention(c.username, c.nama || c.name || c.displayName, c.jenis_akun || c.role);
          }
        });
      }

      setUserMentionsList(Array.from(mentionMap.values()));
    } catch (err) {
      console.warn("Gagal memuat akun pengguna untuk mention:", err);
    }
  };

  // Click outside listener for dropdown menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target as Node)) {
        setShowMentionMenu(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) {
        setActiveMsgMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Floating Mode Resizers (Left & Right Handles) & Window Drag Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current && !isDraggingWindowRef.current) return;

      // If mouse button is released anywhere, release resize/drag immediately
      if (e.buttons === 0) {
        handleMouseUp();
        return;
      }

      const { type, startX, startWidth, startPosX } = dragStateRef.current;
      const screenMargin = window.innerWidth >= 640 ? 16 : 8;

      if (isResizingRef.current) {
        if (type === 'resize_left') {
          // Dragging left handle: moving cursor left increases width
          const deltaX = startX - e.clientX;
          const newWidth = startWidth + deltaX;

          // Prevent left edge from going past left screen boundary (x = screenMargin)
          const maxAllowedWidth = Math.max(340, window.innerWidth - (2 * screenMargin) + startPosX);
          const clampedWidth = Math.max(340, Math.min(newWidth, maxAllowedWidth));
          setFloatingWidth(clampedWidth);
        } else if (type === 'resize_right') {
          // Dragging right handle: moving cursor right increases width
          const deltaX = e.clientX - startX;
          const newWidth = startWidth + deltaX;

          const maxAllowedWidth = Math.max(340, startWidth - startPosX);
          const clampedWidth = Math.max(340, Math.min(newWidth, maxAllowedWidth));
          const widthDiff = clampedWidth - startWidth;
          
          setFloatingWidth(clampedWidth);
          const newPosX = Math.min(0, startPosX + widthDiff);
          setPositionX(newPosX);
        }
      } else if (isDraggingWindowRef.current) {
        const deltaX = e.clientX - startX;
        const newX = startPosX + deltaX;

        // Base right gap is screenMargin (when positionX = 0).
        // Current left gap is (window.innerWidth - screenMargin - startWidth + positionX).
        // For left gap to equal screenMargin: minLeft = -(window.innerWidth - startWidth - 2 * screenMargin).
        const maxLeftShift = -(window.innerWidth - startWidth - (2 * screenMargin));
        const safeMinLeft = Math.min(0, maxLeftShift);
        const maxRight = 0;
        
        const clampedX = Math.max(safeMinLeft, Math.min(newX, maxRight));
        setPositionX(clampedX);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current || isDraggingWindowRef.current) {
        isResizingRef.current = false;
        isDraggingWindowRef.current = false;
        setIsResizing(false);
        setIsDraggingWindow(false);
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointerup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointerup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
    };
  }, []);

  // WebSocket Sync & Background Real-Time Polling
  useEffect(() => {
    const unsubscribe = subscribeRealtimeChanges((payload: any) => {
      if (payload.type === 'admin_chat_message' && payload.message) {
        const normalized = normalizeChatMessage(payload.message);
        setMessages(prev => {
          const exists = prev.some(m => String(m.id) === String(normalized.id));
          if (exists) {
            return prev.map(m => String(m.id) === String(normalized.id) ? { ...m, ...normalized } : m);
          }
          const updated = [...prev, normalized];
          safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        setTimeout(scrollToBottom, 50);
      } else if (payload.type === 'admin_chat_update' && payload.message) {
        const normalized = normalizeChatMessage(payload.message);
        setMessages(prev => {
          const updated = prev.map(m => String(m.id) === String(normalized.id) ? { ...m, ...normalized } : m);
          safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      } else if (payload.type === 'admin_chat_delete' && payload.id) {
        setMessages(prev => {
          const updated = prev.filter(m => String(m.id) !== String(payload.id));
          safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      } else if (payload.event === 'db_change' && payload.table === 'admin_chat') {
        if (payload.data) {
          const items = Array.isArray(payload.data) ? payload.data : [payload.data];
          const normalizedItems = items.map(normalizeChatMessage);
          setMessages(prev => {
            let updated = [...prev];
            normalizedItems.forEach(item => {
              if (payload.action === 'delete') {
                updated = updated.filter(m => String(m.id) !== String(item.id));
              } else {
                const idx = updated.findIndex(m => String(m.id) === String(item.id));
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...item };
                } else {
                  updated.push(item);
                }
              }
            });
            safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
          if (payload.action === 'insert') {
            setTimeout(scrollToBottom, 50);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Keep background page body scroll unlocked so main page remains smooth and operational
  useEffect(() => {
    // Intentionally no body scroll locking to ensure background page stays interactive & smooth
  }, [isOpen]);

  const loadChatMessages = async () => {
    setLoading(true);
    let normalizedList: ChatMessage[] = [];
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      let rawList: any[] = local ? JSON.parse(local) : [];

      const remoteData = await fetchTableData<any>('admin_chat', LOCAL_STORAGE_KEY, rawList);
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        rawList = remoteData;
      }

      normalizedList = rawList.map(normalizeChatMessage);
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedList));
      setMessages(normalizedList);
    } catch (err) {
      console.warn('Menggunakan data obrolan lokal:', err);
    } finally {
      setLoading(false);
      setTimeout(() => jumpToOldestUnreadOrBottom(normalizedList), 60);
    }
  };

  const scrollToBottom = () => {
    setUnreadBelowCount(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Camera Handler Methods
  const startCameraStream = async (facingMode: 'user' | 'environment') => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    setCameraError(null);
    setCapturedImageDataUrl(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung pada browser ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      setCameraFacingMode(facingMode);
    } catch (err: any) {
      console.error('Gagal membuka kamera:', err);
      setCameraError(err.message || 'Izin kamera ditolak atau kamera tidak ditemukan.');
    }
  };

  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current && !capturedImageDataUrl) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [showCameraModal, cameraStream, capturedImageDataUrl]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const handleOpenCamera = () => {
    setShowAttachMenu(false);
    setShowCameraModal(true);
    startCameraStream('environment');
  };

  const handleCloseCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCapturedImageDataUrl(null);
    setCameraError(null);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImageDataUrl(dataUrl);
    }
  };

  const handleConfirmCameraPhoto = () => {
    if (!capturedImageDataUrl) return;

    const approxBytes = Math.round((capturedImageDataUrl.length * 3) / 4);
    setPendingAttachment({
      name: `foto_kamera_${Date.now()}.jpg`,
      url: capturedImageDataUrl,
      type: 'image',
      fileType: 'image',
      size: approxBytes,
      isCompressed: false
    });

    handleCloseCameraModal();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleToggleCameraFacingMode = () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    startCameraStream(nextMode);
  };

  // Helper for file type classification
  const getFileTypeCategory = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mimeType?.startsWith('image/')) return 'image';
    return 'generic';
  };

  // Raw File Upload handler (Option 1: Pdf, Word, Excel, Gambar tanpa kompress)
  const handleRawFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileCategory = getFileTypeCategory(file.name, file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        name: file.name,
        url: reader.result as string,
        type: fileCategory === 'image' ? 'image' : 'file',
        fileType: fileCategory,
        size: file.size,
        isCompressed: false
      });
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Image Upload handler with Auto Compress under 1MB if > 1MB (Option 2)
  const handleCompressedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setShowAttachMenu(false);

    try {
      if (file.size <= 1024 * 1024) {
        // Under 1MB: read directly
        const reader = new FileReader();
        reader.onload = () => {
          setPendingAttachment({
            name: file.name,
            url: reader.result as string,
            type: 'image',
            fileType: 'image',
            size: file.size,
            isCompressed: false
          });
          setIsCompressing(false);
        };
        reader.readAsDataURL(file);
      } else {
        // Over 1MB: Auto compress using Canvas
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale max resolution to 1600px
          const MAX_DIM = 1600;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress JPEG quality iteratively to keep base64 size < 1MB (~1,300,000 chars)
            let quality = 0.85;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            while (compressedDataUrl.length > 1300000 && quality > 0.3) {
              quality -= 0.15;
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);

            setPendingAttachment({
              name: file.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg",
              url: compressedDataUrl,
              type: 'image',
              fileType: 'image',
              size: approxBytes,
              isCompressed: true
            });
          }
          setIsCompressing(false);
        };

        img.onerror = () => {
          setIsCompressing(false);
        };
      }
    } catch (err) {
      console.error("Gagal kompresi gambar:", err);
      setIsCompressing(false);
    }
    e.target.value = '';
  };

  // Textarea Change & @ Mention Handling
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorIndex = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorIndex);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query.toLowerCase());
        setShowMentionMenu(true);
        setMentionSelectedIndex(0);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  // Select Mention Item
  const handleSelectMention = (displayTag: string) => {
    if (!inputRef.current) return;
    const cursorIndex = inputRef.current.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorIndex);
    const textAfterCursor = inputText.slice(cursorIndex);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    const insertedText = `${displayTag} `;
    let newCursorPos = 0;

    if (lastAtPos !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtPos) + insertedText + textAfterCursor;
      setInputText(newText);
      newCursorPos = lastAtPos + insertedText.length;
    } else {
      setInputText(prev => prev + insertedText);
      newCursorPos = inputText.length + insertedText.length;
    }

    setShowMentionMenu(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  // Scroll active mention menu item into view when navigating with arrow keys
  useEffect(() => {
    if (showMentionMenu && mentionMenuRef.current) {
      const activeEl = mentionMenuRef.current.querySelector(
        `[data-mention-index="${mentionSelectedIndex}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [mentionSelectedIndex, showMentionMenu]);

  const filteredMentions = userMentionsList.filter(m => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return (
      (m.display && m.display.toLowerCase().includes(q)) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.id && m.id.toLowerCase().includes(q))
    );
  });

  // Send or Save Edited Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !pendingAttachment) return;

    // Process pendingAttachment upload to server storage if base64
    let finalAttachment = pendingAttachment;
    if (pendingAttachment && pendingAttachment.url && pendingAttachment.url.startsWith('data:')) {
      try {
        const serverUrl = await uploadFileToStorage(pendingAttachment.url, pendingAttachment.name, 'chat_media');
        finalAttachment = {
          ...pendingAttachment,
          url: serverUrl
        };
      } catch (err) {
        console.warn('Gagal mengunggah lampiran chat ke server storage:', err);
      }
    }

    // Handle Edit Existing Message
    if (editingMsgId) {
      const updatedList = messages.map(m => {
        if (String(m.id) === String(editingMsgId)) {
          return {
            ...m,
            message: trimmed || m.message,
            attachment: finalAttachment || m.attachment,
            is_edited: true,
            edited_at: new Date().toISOString()
          };
        }
        return m;
      });

      setMessages(updatedList);
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

      const editedMsg = updatedList.find(m => String(m.id) === String(editingMsgId));
      if (editedMsg) {
        sendRealtimeWSMessage({
          type: 'admin_chat_update',
          message: editedMsg
        });
        try {
          await updateTableRow('admin_chat', LOCAL_STORAGE_KEY, editingMsgId, editedMsg);
        } catch (err) {
          console.warn("Gagal update pesan di database:", err);
        }
      }

      setEditingMsgId(null);
      setInputText('');
      setPendingAttachment(null);
      setShowMentionMenu(false);
      return;
    }

    // New Message Creation
    const nowIso = new Date().toISOString();
    const avatarUrl = localStorage.getItem('smartsantri_active_avatar') || undefined;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender_username: currentUsername,
      sender_name: currentDisplayName,
      sender_role: currentRole,
      sender_avatar: avatarUrl,
      sender: currentUsername,
      senderRole: currentRole,
      senderAvatar: avatarUrl,
      recipient_role: activeChannel,
      message: trimmed,
      text: trimmed,
      attachment: finalAttachment || undefined,
      reply_to: replyToMsg ? {
        id: replyToMsg.id,
        sender_name: (replyToMsg.sender_username && replyToMsg.sender_username.toLowerCase() === currentUsername.toLowerCase())
          ? 'Anda' 
          : (replyToMsg.sender_name || replyToMsg.sender || 'Admin'),
        message: replyToMsg.message || replyToMsg.text || (replyToMsg.attachment ? `[File: ${replyToMsg.attachment.name}]` : 'Lampiran')
      } : undefined,
      created_at: nowIso,
      timestamp: nowIso
    };

    setMessages(prev => {
      const updated = [...prev, newMsg];
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setInputText('');
    setPendingAttachment(null);
    setReplyToMsg(null);
    setShowMentionMenu(false);
    setTimeout(scrollToBottom, 50);

    sendRealtimeWSMessage({
      type: 'admin_chat_message',
      message: newMsg
    });

    try {
      await insertTableRow('admin_chat', LOCAL_STORAGE_KEY, newMsg);
    } catch (err) {
      console.warn('Gagal menyimpan pesan ke database remote:', err);
    }
  };

  // Start Reply Handler
  const handleStartReply = (msg: ChatMessage) => {
    setReplyToMsg(msg);
    setActiveMsgMenuId(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Scroll to original message
  const scrollToMsg = (targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-purple-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-purple-400');
      }, 1500);
    }
  };

  // Start Editing Message
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setInputText(msg.message);
    setPendingAttachment(msg.attachment || null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setInputText('');
    setPendingAttachment(null);
  };

  const handleDeleteMessage = async (msgId: string) => {
    setPinnedMsgIds(prev => prev.filter(id => String(id) !== String(msgId)));
    setMessages(prev => {
      const updated = prev.filter(m => String(m.id) !== String(msgId));
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteTableRow('admin_chat', LOCAL_STORAGE_KEY, msgId);
      sendRealtimeWSMessage({
        type: 'admin_chat_delete',
        id: msgId
      });
    } catch (err) {
      console.warn('Gagal menghapus pesan:', err);
    }
  };

  const handleDeleteMultipleMessages = async (msgIds: string[]) => {
    if (!msgIds || msgIds.length === 0) return;
    const count = msgIds.length;
    setPinnedMsgIds(prev => prev.filter(id => !msgIds.includes(String(id))));
    setMessages(prev => {
      const updated = prev.filter(m => !msgIds.includes(String(m.id)));
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    for (const id of msgIds) {
      try {
        await deleteTableRow('admin_chat', LOCAL_STORAGE_KEY, id);
        sendRealtimeWSMessage({
          type: 'admin_chat_delete',
          id: id
        });
      } catch (err) {
        console.warn('Gagal menghapus pesan:', err);
      }
    }
    setSelectedMediaIds([]);
    setSelectedMediaId(null);
    setShowDeleteMediaModal(false);
    showToast(`${count} file media berhasil dihapus`);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      let str = String(isoString).trim();
      if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
      }
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        const timeMatch = str.match(/\b\d{2}:\d{2}\b/);
        if (timeMatch) return timeMatch[0];
        return '';
      }
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getDateLabel = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      let str = String(isoString).trim();
      if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
      }
      const msgDate = new Date(str);
      if (isNaN(msgDate.getTime())) return '';

      const today = new Date();
      const isSameYear = msgDate.getFullYear() === today.getFullYear();
      const isSameMonth = isSameYear && msgDate.getMonth() === today.getMonth();
      const isSameDay = isSameMonth && msgDate.getDate() === today.getDate();

      if (isSameDay) return 'Hari ini';

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const isYesterday =
        msgDate.getFullYear() === yesterday.getFullYear() &&
        msgDate.getMonth() === yesterday.getMonth() &&
        msgDate.getDate() === yesterday.getDate();

      if (isYesterday) return 'Kemarin';

      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMsgDate = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
      const diffDays = Math.round((startOfToday.getTime() - startOfMsgDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays > 0 && diffDays < 7) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return days[msgDate.getDay()];
      }

      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const dayNum = msgDate.getDate();
      const monthName = months[msgDate.getMonth()];
      const yearNum = msgDate.getFullYear();

      if (isSameYear) {
        return `${dayNum} ${monthName}`;
      } else {
        return `${dayNum} ${monthName} ${yearNum}`;
      }
    } catch (e) {
      return '';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Highlight @ Mentions inside message text
  const renderFormattedMessageText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[\w.-]+(?:@[\w.-]+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="inline-block bg-purple-200/80 text-purple-900 font-extrabold px-1.5 py-0.5 rounded-md text-[0.95em] mx-0.5 shadow-2xs">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredMessages = messages.filter(m => {
    if (!m) return false;
    const targetChannel = m.recipient_role || 'semua';
    const activeChan = activeChannel || 'semua';
    const matchesChannel = activeChan === 'semua' || targetChannel === 'semua' || (targetChannel || '').toLowerCase() === (activeChan || '').toLowerCase();
    
    if (!matchesChannel) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const msgText = (m.message || '').toLowerCase();
      const senderName = (m.sender_name || m.sender || '').toLowerCase();
      return msgText.includes(q) || senderName.includes(q);
    }

    return true;
  });

  // Extract all media attachments for Media Tab (with optional Star filter)
  const mediaMessages = messages.filter(m => {
    if (!m.attachment || !m.attachment.url) return false;
    if (filterOnlyStarred) {
      return starredMediaIds.includes(m.id);
    }
    return true;
  });

  // Pinned messages list
  const pinnedMessages = messages.filter(m => pinnedMsgIds.map(String).includes(String(m.id)));

  // Selected media message object for Action Panel
  const selectedMediaMsg = selectedMediaId ? messages.find(m => m.id === selectedMediaId) : null;

  if (!isOpen && !isClosing) return null;

  // Layout mode class selector
  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'full':
        return 'w-full h-screen rounded-none my-0 right-0 top-0 border-none shadow-none';
      case 'sidebar':
        return 'w-full sm:w-[420px] md:w-[460px] h-screen rounded-none my-0 right-0 top-0 border-l';
      case 'floating':
      default:
        return 'h-[96vh] sm:h-[94vh] my-auto rounded-[28px] border shadow-2xl overflow-hidden';
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex overflow-hidden pointer-events-none transition-all ${
      layoutMode === 'full' ? 'justify-stretch items-stretch p-0' : 'justify-end items-center p-2 sm:p-4'
    }`}>
      {/* Hidden File Inputs */}
      <input 
        ref={rawFileInputRef} 
        type="file" 
        onChange={handleRawFileUpload} 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.png,.jpg,.jpeg,.webp" 
        className="hidden" 
      />
      <input 
        ref={imageFileInputRef} 
        type="file" 
        onChange={handleCompressedImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Main Chat Box Window with Fast Bottom-to-Top Entrance & Top-to-Bottom Exit Animation */}
      <div 
        style={{
          width: layoutMode === 'floating' ? `${floatingWidth}px` : undefined,
          minWidth: layoutMode === 'floating' ? '340px' : undefined,
          maxWidth: layoutMode === 'floating' ? '100vw' : undefined,
          transform: layoutMode === 'floating' ? `translateX(${positionX}px)` : undefined,
          overscrollBehavior: 'contain'
        }}
        className={`relative z-10 pointer-events-auto flex flex-col bg-white border-slate-200/90 shadow-2xl ${
          (isResizing || isDraggingWindow) ? 'transition-none' : 'transition-all duration-150 ease-out'
        } overscroll-contain ${
          isClosing 
            ? 'animate-out fade-out slide-out-to-bottom-full duration-150 ease-in' 
            : 'animate-in fade-in slide-in-from-bottom-full duration-150 ease-out'
        } ${getLayoutClasses()}`}
      >
        {/* Drag Handle on Left Edge for Floating Width Resizing */}
        {layoutMode === 'floating' && (
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              document.body.style.userSelect = 'none';
              isResizingRef.current = true;
              setIsResizing(true);
              dragStateRef.current = {
                type: 'resize_left',
                startX: e.clientX,
                startWidth: floatingWidthRef.current,
                startPosX: positionXRef.current
              };
            }}
            className={`absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-30 group hover:bg-purple-500/20 transition-colors flex items-center justify-center ${isResizing ? 'bg-purple-500/30' : ''}`}
            title="Tarik sisi kiri untuk merubah lebar obrolan (Hingga batas layar)"
          >
            <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-purple-600 transition-colors" />
          </div>
        )}

        {/* Drag Handle on Right Edge for Floating Width Resizing */}
        {layoutMode === 'floating' && (
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              document.body.style.userSelect = 'none';
              isResizingRef.current = true;
              setIsResizing(true);
              dragStateRef.current = {
                type: 'resize_right',
                startX: e.clientX,
                startWidth: floatingWidthRef.current,
                startPosX: positionXRef.current
              };
            }}
            className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-30 group hover:bg-purple-500/20 transition-colors flex items-center justify-center ${isResizing ? 'bg-purple-500/30' : ''}`}
            title="Tarik sisi kanan untuk merubah lebar obrolan (Hingga batas layar)"
          >
            <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-purple-600 transition-colors" />
          </div>
        )}

        {/* TOP HEADER BAR (Entire header area draggable in floating mode) */}
        <div 
          onMouseDown={(e) => {
            if (layoutMode === 'floating') {
              e.preventDefault();
              document.body.style.userSelect = 'none';
              isDraggingWindowRef.current = true;
              setIsDraggingWindow(true);
              dragStateRef.current = {
                type: 'window',
                startX: e.clientX,
                startWidth: floatingWidthRef.current,
                startPosX: positionXRef.current
              };
            }
          }}
          className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-5 ${
            layoutMode === 'floating' 
              ? 'cursor-grab active:cursor-grabbing select-none' 
              : ''
          }`}
          title={layoutMode === 'floating' ? 'Tahan dan geser area header untuk memindahkan kotak obrolan' : undefined}
        >
          {/* Left: Chat / Media Switcher Pill */}
          <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center bg-[#f2f3f5] p-1 rounded-full border border-slate-200/50">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                onMouseDown={(e) => e.stopPropagation()}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                  activeTab === 'chat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                Chat
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer select-none ${
                    activeTab === 'media'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 font-medium'
                  }`}
                >
                  Media
                </button>
                {activeTab === 'media' && (
                  <button
                    type="button"
                    onClick={() => setFilterOnlyStarred(!filterOnlyStarred)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      filterOnlyStarred
                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400 font-bold'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                    }`}
                    title={filterOnlyStarred ? 'Tampilkan semua media' : 'Filter media berbintang ⭐'}
                  >
                    <Star className={`h-3.5 w-3.5 ${filterOnlyStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>

            {/* Layout Mode Switcher [|] */}
            <div className="relative" ref={layoutMenuRef}>
              <button
                type="button"
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                  showLayoutMenu ? 'bg-slate-100' : ''
                }`}
                title="Atur Tampilan Layout"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round">
                  <rect width="18" height="18" x="3" y="3" rx="3" />
                  <path d="M15 3v18" />
                </svg>
              </button>

              {/* Layout Dropdown Menu */}
              {showLayoutMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('sidebar');
                      setShowLayoutMenu(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                      layoutMode === 'sidebar' ? 'bg-slate-100/80 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {layoutMode === 'sidebar' ? <Check className="h-4 w-4 shrink-0 text-slate-900" /> : <span className="w-4" />}
                    <span>Sidebar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('floating');
                      setShowLayoutMenu(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                      layoutMode === 'floating' ? 'bg-slate-100/80 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {layoutMode === 'floating' ? <Check className="h-4 w-4 shrink-0 text-slate-900" /> : <span className="w-4" />}
                    <span>Floating</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('full');
                      setShowLayoutMenu(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                      layoutMode === 'full' ? 'bg-slate-100/80 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {layoutMode === 'full' ? <Check className="h-4 w-4 shrink-0 text-slate-900" /> : <span className="w-4" />}
                    <span>Halaman penuh</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sembunyikan Button ->| */}
            <div className="relative group/tooltip">
              <button
                type="button"
                onClick={handleCloseWithAnimation}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-2 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Sembunyikan"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round">
                  <path d="M5 12h12" />
                  <path d="m13 18 5-6-5-6" />
                  <path d="M20 5v14" />
                </svg>
              </button>

              {/* Tooltip Popup strictly on hover */}
              <div className="hidden group-hover/tooltip:block absolute right-0 top-12 z-50 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-lg whitespace-nowrap pointer-events-none transition-opacity">
                Sembunyikan
              </div>
            </div>
          </div>
        </div>

        {/* WHATSAPP-STYLE PINNED MESSAGES BANNER */}
        {activeTab === 'chat' && pinnedMessages.length > 0 && (() => {
          const safePinnedIndex = pinnedMessages.length > 0 ? (activePinnedIndex % pinnedMessages.length) : 0;
          const activePinnedMsg = pinnedMessages[safePinnedIndex] || null;
          if (!activePinnedMsg) return null;

          return (
            <div className="bg-[#f0f2f5] border-b border-slate-200/90 px-3.5 py-2 shrink-0 shadow-2xs relative z-20 select-none">
              <div className={`flex items-center justify-between w-full ${layoutMode === 'full' ? 'max-w-4xl sm:max-w-[60%] mx-auto' : ''}`}>
                {/* Left Edge Vertical Marker, Pin Icon, and Message Text */}
              <div
                onClick={() => {
                  if (pinnedMessages.length > 1) {
                    const nextIdx = (safePinnedIndex + 1) % pinnedMessages.length;
                    setActivePinnedIndex(nextIdx);
                    handleShowInChat(pinnedMessages[nextIdx].id);
                  } else {
                    handleShowInChat(activePinnedMsg.id);
                  }
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                title="Klik untuk melihat atau berpindah ke pesan disematkan"
              >
                {/* Vertical Marker Line */}
                <div className="flex items-center gap-1 shrink-0">
                  {pinnedMessages.length > 1 ? (
                    <div className="flex flex-col gap-0.5 justify-center h-6">
                      {pinnedMessages.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-[3.5px] rounded-full transition-all ${
                            idx === safePinnedIndex ? 'h-3.5 bg-slate-800' : 'h-1.5 bg-slate-400/60'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="w-[3.5px] h-6 bg-slate-800 rounded-full shrink-0" />
                  )}
                </div>

                {/* Pin Icon */}
                <Pin className="h-4 w-4 text-slate-700 shrink-0 fill-slate-700/20 -rotate-12" />

                {/* Message Content Preview */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-slate-800 truncate leading-snug group-hover:text-slate-950">
                    {activePinnedMsg.message || (activePinnedMsg.attachment ? `[File: ${activePinnedMsg.attachment.name}]` : 'Pesan')}
                  </p>
                </div>
              </div>

              {/* Right Dropdown Chevron Button */}
              <div className="relative shrink-0 ml-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPinnedDropdown((prev) => !prev);
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                  title="Opsi sematan"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showPinnedDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Options Popup */}
                {showPinnedDropdown && (
                  <div
                    ref={pinnedDropdownRef}
                    className="absolute top-9 right-0 z-50 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200/90 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestPinMessage(activePinnedMsg.id);
                        setShowPinnedDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      <PinOff className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Lepas sematan</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowInChat(activePinnedMsg.id);
                        setShowPinnedDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                    >
                      <ArrowRight className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>Buka pesan</span>
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: MEDIA CONTENT BODY (COMPACT DESKTOP ICON VIEW) */}
        {activeTab === 'media' ? (
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto overscroll-contain bg-slate-50/60">
            <div className={`w-full ${layoutMode === 'full' ? 'max-w-4xl sm:max-w-[60%] mx-auto' : ''}`}>
              {mediaMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Paperclip className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600 mb-1">Belum Ada Media</p>
                  <p className="text-[11px] text-slate-400">Semua foto, dokumen PDF, Word, atau Excel yang dikirim akan tampil di sini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {mediaMessages.map((m) => {
                    const att = m.attachment!;
                  const fileName = att.name || 'File';
                  const lowerName = fileName.toLowerCase();
                  const isImage = att.type === 'image' || att.fileType === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
                  const isExcel = att.fileType === 'excel' || /\.(xlsx|xls|csv)$/i.test(fileName);
                  const isWord = att.fileType === 'word' || /\.(docx|doc)$/i.test(fileName);
                  const isPdf = att.fileType === 'pdf' || /\.pdf$/i.test(fileName);
                  const isZip = /\.(zip|rar|tar|gz|7z)$/i.test(fileName) || lowerName.includes('pindahan');
                  const isSql = /\.(sql|db|sqlite)$/i.test(fileName);

                  const isHighlighted = selectedMediaId === m.id;
                  const isMultiSelected = selectedMediaIds.includes(m.id);
                  const isStarred = starredMediaIds.includes(m.id);

                  return (
                    <div 
                      key={m.id}
                      onClick={() => {
                        if (selectedMediaIds.length > 0) {
                          setSelectedMediaIds(prev => 
                            prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                          );
                        } else {
                          setSelectedMediaId(prev => prev === m.id ? null : m.id);
                        }
                      }}
                      onDoubleClick={() => handlePreviewMedia(m)}
                      className={`relative group flex flex-col items-center text-center p-2.5 rounded-2xl transition-all cursor-pointer select-none border ${
                        isMultiSelected
                          ? 'bg-purple-100/90 border-purple-600 ring-2 ring-purple-600 shadow-md scale-[1.02]' 
                          : isHighlighted
                          ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-300 shadow-md scale-[1.02]' 
                          : 'bg-white/60 border-slate-200/80 hover:bg-white hover:shadow-md'
                      }`}
                      title={`${fileName} (${formatFileSize(att.size)}) - oleh ${m.sender_name}\nKlik 1x: Sorot | Klik 2x: Preview`}
                    >
                      {/* Badges on top of card */}
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                        {isStarred && (
                          <span className="p-0.5 rounded-full bg-amber-400 text-white shadow-xs" title="Ditandai">
                            <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                        {/* Centang hanya muncul jika dalam mode pilih (selectedMediaIds) */}
                        {isMultiSelected && (
                          <span className="p-0.5 rounded-full bg-purple-600 text-white shadow-xs animate-in zoom-in-50 duration-100">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      {/* File Card Icon Preview */}
                      <div className="relative w-16 h-20 mb-1.5 flex items-center justify-center rounded-xl overflow-hidden bg-white shadow-2xs border border-slate-200/90 group-hover:shadow-md group-hover:scale-105 transition-all">
                        {isImage ? (
                          <img src={att.url} alt={fileName} className="w-full h-full object-cover" />
                        ) : isZip ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-amber-50">
                            {/* Zip / Folder Icon */}
                            <div className="w-10 h-10 rounded-md bg-amber-400 border border-amber-500/50 shadow-2xs flex items-center justify-center text-white relative">
                              <div className="w-6 h-1 bg-amber-200 rounded-xs absolute top-1.5" />
                              <div className="w-4 h-0.5 bg-amber-600 rounded-xs absolute top-3" />
                              <div className="w-4 h-0.5 bg-amber-600 rounded-xs absolute top-4" />
                            </div>
                          </div>
                        ) : isExcel ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="absolute top-1 left-1 w-5 h-5 bg-emerald-600 rounded flex items-center justify-center text-white font-black text-[11px] shadow-2xs">
                                S
                              </div>
                              <div className="w-6 h-0.5 bg-emerald-200 rounded my-0.5 mt-5" />
                              <div className="w-6 h-0.5 bg-emerald-200 rounded" />
                              <div className="w-6 h-0.5 bg-emerald-200 rounded mt-0.5" />
                            </div>
                          </div>
                        ) : isWord ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="absolute top-1 left-1 w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white font-black text-[11px] shadow-2xs">
                                W
                              </div>
                              <div className="w-6 h-0.5 bg-blue-200 rounded my-0.5 mt-5" />
                              <div className="w-6 h-0.5 bg-blue-200 rounded" />
                              <div className="w-6 h-0.5 bg-blue-200 rounded mt-0.5" />
                            </div>
                          </div>
                        ) : isPdf ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="absolute top-1 left-1 w-5 h-5 bg-rose-600 rounded flex items-center justify-center text-white font-black text-[8px] shadow-2xs">
                                PDF
                              </div>
                              <div className="w-6 h-0.5 bg-rose-200 rounded my-0.5 mt-5" />
                              <div className="w-6 h-0.5 bg-rose-200 rounded" />
                            </div>
                          </div>
                        ) : isSql ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="w-6 h-0.5 bg-slate-300 rounded mb-1" />
                              <div className="w-6 h-0.5 bg-purple-400 rounded mb-1" />
                              <div className="w-4 h-0.5 bg-slate-300 rounded" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center">
                              <FileText className="h-6 w-6 text-slate-400" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* File Title */}
                      <p className={`text-[11px] leading-tight line-clamp-2 w-full break-words ${
                        (isHighlighted || isMultiSelected) ? 'text-purple-900 font-bold' : 'text-slate-700 font-medium group-hover:text-purple-700'
                      }`}>
                        {fileName}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        ) : (
          /* TAB 1: MAIN CHAT MESSAGES LIST */
          <div 
            ref={scrollContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 scrollbar-thin relative"
          >
            <div className={`w-full space-y-4 ${layoutMode === 'full' ? 'max-w-4xl sm:max-w-[60%] mx-auto' : ''}`}>
              {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs font-medium py-12">
                Memuat percakapan...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <p className="text-sm font-medium text-slate-600 mb-1">
                  Kirim <strong className="text-slate-900">pesan obrolan group admin</strong>
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Sebut admin spesifik dengan <code className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">@email</code> atau rule <code className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">@sekretaris</code>.
                </p>
              </div>
            ) : (
              (() => {
                // Sort messages chronologically ascending by date/timestamp
                const sortedFilteredMessages = [...filteredMessages].sort((a, b) => {
                  const parseTime = (isoStr?: string) => {
                    if (!isoStr) return 0;
                    let str = String(isoStr).trim();
                    if (str.includes(' ') && !str.includes('T')) {
                      str = str.replace(' ', 'T');
                    }
                    const t = new Date(str).getTime();
                    return isNaN(t) ? 0 : t;
                  };
                  return parseTime(a.created_at || a.timestamp) - parseTime(b.created_at || b.timestamp);
                });

                // Group messages by date
                const groupedMessages: { dateKey: string; label: string; msgs: ChatMessage[] }[] = [];
                sortedFilteredMessages.forEach((msg) => {
                  let str = String(msg.created_at || msg.timestamp || '').trim();
                  if (str.includes(' ') && !str.includes('T')) {
                    str = str.replace(' ', 'T');
                  }
                  const d = new Date(str);
                  const dateKey = isNaN(d.getTime())
                    ? 'unknown'
                    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const label = getDateLabel(msg.created_at || msg.timestamp);

                  const lastGroup = groupedMessages[groupedMessages.length - 1];
                  if (lastGroup && lastGroup.dateKey === dateKey) {
                    lastGroup.msgs.push(msg);
                  } else {
                    groupedMessages.push({ dateKey, label, msgs: [msg] });
                  }
                });

                return groupedMessages.map((group) => (
                  <div key={group.dateKey} className="relative space-y-4">
                    {/* Sticky Floating Date Badge (WhatsApp Style - rounded-full circle sempurna floating at top on scroll) */}
                    {group.label && (
                      <div className="sticky top-1 z-20 flex justify-center my-2 pointer-events-none">
                        <span className="px-3.5 py-1 rounded-full text-[10.5px] font-bold bg-white/95 text-slate-700 shadow-xs border border-slate-200/90 backdrop-blur-md select-none pointer-events-auto flex items-center gap-1">
                          {group.label}
                        </span>
                      </div>
                    )}

                    {group.msgs.map((msg) => {
                      if (msg.is_system_notice || msg.sender_username === 'system' || msg.sender === 'system') {
                        return (
                          <div key={msg.id} id={`msg-${msg.id}`} className="flex justify-center my-2.5">
                            <div className="bg-slate-200/80 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold px-3.5 py-1.5 rounded-2xl shadow-2xs backdrop-blur-xs flex items-center gap-1.5 border border-slate-300/60 max-w-[85%] text-center select-none transition-colors">
                              <Pin className="h-3 w-3 text-slate-600 fill-slate-600 shrink-0" />
                              <span>{msg.message}</span>
                            </div>
                          </div>
                        );
                      }

                      const senderUsername = (msg.sender_username || (msg.sender && msg.sender.includes('@') ? msg.sender : '') || '').trim().toLowerCase();
                      const myUsername = (currentUsername || '').trim().toLowerCase();

                      const isMe = Boolean(senderUsername) && Boolean(myUsername)
                        ? (senderUsername === myUsername)
                        : (Boolean(msg.sender) && Boolean(myUsername) && msg.sender.trim().toLowerCase() === myUsername);

                      const displaySenderName = (msg.sender_name && msg.sender_name.trim() !== 'Admin' ? msg.sender_name : '') ||
                                                (senderUsername ? senderUsername : '') ||
                                                msg.sender ||
                                                'Admin';

                      return (
                        <div
                          key={msg.id}
                          id={`msg-${msg.id}`}
                          className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} rounded-2xl transition-all duration-300`}
                        >
                          {isMe ? (
                            /* USER SENT MESSAGE (RIGHT ALIGNED) */
                            <div className="relative max-w-[88%] sm:max-w-[82%] min-w-[150px]">
                              {/* Hover ChevronDown (v) Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMsgMenuId(String(activeMsgMenuId) === String(msg.id) ? null : String(msg.id));
                                }}
                                className={`absolute top-1.5 right-1.5 z-20 p-1 rounded-full transition-all cursor-pointer ${
                                  String(activeMsgMenuId) === String(msg.id)
                                    ? 'opacity-100 bg-black/10'
                                    : 'opacity-70 sm:opacity-0 group-hover:opacity-100 hover:opacity-100'
                                } text-purple-800 hover:bg-purple-200/80`}
                                title="Opsi Pesan"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>

                              {/* Dropdown Options Popup Menu */}
                              {String(activeMsgMenuId) === String(msg.id) && (
                                <div 
                                  ref={msgMenuRef}
                                  className="absolute top-8 right-1 z-50 w-40 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-200 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleStartReply(msg)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Reply className="h-3.5 w-3.5 text-purple-600" />
                                    <span>Balas</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleTogglePinMessage(msg.id);
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Pin className={`h-3.5 w-3.5 ${pinnedMsgIds.map(String).includes(String(msg.id)) ? 'fill-purple-600 text-purple-600' : 'text-purple-600'}`} />
                                    <span>{pinnedMsgIds.map(String).includes(String(msg.id)) ? 'Lepas Sematan' : 'Sematkan'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCopyText(msg.message, String(msg.id));
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                                    <span>Salin</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleStartEdit(msg);
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteId(String(msg.id));
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              )}

                              {/* User Sent Bubble */}
                              <div className="rounded-[20px] rounded-tr-xs p-3 pr-7 bg-[#f0ebff] text-[#4c1d95] text-xs sm:text-sm font-medium leading-relaxed shadow-2xs border border-purple-200/60">
                                {/* Replied Quote Box */}
                                {msg.reply_to && (
                                  <div 
                                    onClick={() => scrollToMsg(msg.reply_to!.id)}
                                    className="mb-2 rounded-xl bg-purple-200/60 border-l-[4px] border-purple-800 p-2 text-xs flex flex-col cursor-pointer hover:bg-purple-200/80 transition-colors"
                                  >
                                    <span className="font-bold text-purple-950 text-[11px] truncate">
                                      {msg.reply_to.sender_name}
                                    </span>
                                    <p className="text-purple-900/90 text-[11px] truncate font-normal mt-0.5">
                                      {msg.reply_to.message}
                                    </p>
                                  </div>
                                )}

                                {/* Image Attachment First (if present) + Caption Below */}
                                {msg.attachment && msg.attachment.type === 'image' ? (
                                  <>
                                    <div className="rounded-xl overflow-hidden bg-white/80 p-2 border border-purple-200">
                                      <img 
                                        src={msg.attachment.url} 
                                        alt={msg.attachment.name} 
                                        onClick={() => setPreviewImageModal({ url: msg.attachment!.url, name: msg.attachment!.name })}
                                        className="max-h-64 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-xs" 
                                      />
                                      <div className="flex items-center justify-between text-[10px] text-purple-800 font-bold px-1 mt-1">
                                        <span className="truncate">{msg.attachment.name}</span>
                                      </div>
                                    </div>
                                    {/* Message Caption Below Image */}
                                    {msg.message && (
                                      <p className="whitespace-pre-wrap mt-2 px-0.5">{renderFormattedMessageText(msg.message)}</p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {/* Message Text */}
                                    {msg.message && (
                                      <p className="whitespace-pre-wrap">{renderFormattedMessageText(msg.message)}</p>
                                    )}

                                    {/* Non-Image File Attachment */}
                                    {msg.attachment && (
                                      <div className="mt-2 rounded-xl overflow-hidden bg-white/80 p-2 border border-purple-200">
                                        <a 
                                          href={msg.attachment.url} 
                                          download={msg.attachment.name} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="flex items-center gap-2 p-1.5 hover:bg-purple-100 rounded-lg transition-colors text-purple-900"
                                        >
                                          <FileText className="h-5 w-5 text-purple-700 shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                                            <p className="text-[9px] text-purple-600 font-medium">{formatFileSize(msg.attachment.size)}</p>
                                          </div>
                                          <Download className="h-4 w-4 shrink-0 text-purple-700" />
                                        </a>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Bottom Right Time & Pin Indicator */}
                                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-purple-600/90 font-semibold select-none">
                                  {pinnedMsgIds.includes(msg.id) && (
                                    <span title="Pesan Disematkan">
                                      <Pin className="h-3 w-3 fill-purple-700 text-purple-700 shrink-0 mr-0.5" />
                                    </span>
                                  )}
                                  {msg.is_edited && <span className="italic font-bold text-purple-700 mr-0.5">(edited)</span>}
                                  <span>{formatTime(msg.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* RECEIVED MESSAGE (LEFT ALIGNED WITH AVATAR CIRCLE & NAME) */
                            <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                              {/* Avatar Circle */}
                              {msg.sender_avatar ? (
                                <img
                                  src={msg.sender_avatar}
                                  alt={displaySenderName || 'Avatar'}
                                  className="w-8 h-8 rounded-full object-cover border border-purple-200 shadow-2xs shrink-0 mt-0.5"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-white mt-0.5 select-none">
                                  {(displaySenderName || 'A').trim().charAt(0).toUpperCase()}
                                </div>
                              )}

                              {/* Content Container */}
                              <div className="flex flex-col min-w-0 flex-1">
                                {/* Sender Name & Role Label */}
                                <div className="flex items-center gap-1.5 mb-1 px-0.5 text-[11px] font-bold text-slate-800">
                                  <span>{displaySenderName}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-extrabold uppercase">
                                    {msg.sender_role || msg.senderRole || 'Admin'}
                                  </span>
                                </div>

                                {/* Message Bubble Box */}
                                <div className="relative min-w-[150px]">
                                  {/* Hover ChevronDown (v) Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMsgMenuId(String(activeMsgMenuId) === String(msg.id) ? null : String(msg.id));
                                    }}
                                    className={`absolute top-1.5 right-1.5 z-20 p-1 rounded-full transition-all cursor-pointer ${
                                      String(activeMsgMenuId) === String(msg.id)
                                        ? 'opacity-100 bg-black/10'
                                        : 'opacity-70 sm:opacity-0 group-hover:opacity-100 hover:opacity-100'
                                    } text-slate-500 hover:bg-slate-200/80`}
                                    title="Opsi Pesan"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>

                                  {/* Dropdown Options Popup Menu */}
                                  {String(activeMsgMenuId) === String(msg.id) && (
                                    <div 
                                      ref={msgMenuRef}
                                      className="absolute top-8 right-1 z-50 w-40 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-200 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleStartReply(msg)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                      >
                                        <Reply className="h-3.5 w-3.5 text-purple-600" />
                                        <span>Balas</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleTogglePinMessage(msg.id);
                                          setActiveMsgMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                      >
                                        <Pin className={`h-3.5 w-3.5 ${pinnedMsgIds.map(String).includes(String(msg.id)) ? 'fill-purple-600 text-purple-600' : 'text-purple-600'}`} />
                                        <span>{pinnedMsgIds.map(String).includes(String(msg.id)) ? 'Lepas Sematan' : 'Sematkan'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCopyText(msg.message, String(msg.id));
                                          setActiveMsgMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                      >
                                        <Copy className="h-3.5 w-3.5 text-blue-600" />
                                        <span>Salin</span>
                                      </button>
                                      {currentRole === 'superadmin' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmDeleteId(String(msg.id));
                                            setActiveMsgMenuId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          <span>Hapus</span>
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Received Message Bubble */}
                                  <div className="rounded-[20px] rounded-tl-xs p-3 pr-7 bg-white text-slate-800 text-xs sm:text-sm font-normal leading-relaxed shadow-2xs border border-slate-200/90">
                                    {/* Replied Quote Box */}
                                    {msg.reply_to && (
                                      <div 
                                        onClick={() => scrollToMsg(msg.reply_to!.id)}
                                        className="mb-2 rounded-xl bg-slate-100 border-l-[4px] border-amber-700 p-2 text-xs flex flex-col cursor-pointer hover:bg-slate-200/60 transition-colors"
                                      >
                                        <span className="font-bold text-amber-800 text-[11px] truncate">
                                          {msg.reply_to.sender_name}
                                        </span>
                                        <p className="text-slate-600 text-[11px] truncate font-normal mt-0.5">
                                          {msg.reply_to.message}
                                        </p>
                                      </div>
                                    )}

                                    {/* Image Attachment First (if present) + Caption Below */}
                                    {msg.attachment && msg.attachment.type === 'image' ? (
                                      <>
                                        <div className="rounded-xl overflow-hidden bg-slate-50 p-2 border border-slate-200">
                                          <img 
                                            src={msg.attachment.url} 
                                            alt={msg.attachment.name} 
                                            onClick={() => setPreviewImageModal({ url: msg.attachment!.url, name: msg.attachment!.name })}
                                            className="max-h-64 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-xs" 
                                          />
                                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold px-1 mt-1">
                                            <span className="truncate">{msg.attachment.name}</span>
                                          </div>
                                        </div>
                                        {/* Message Caption Below Image */}
                                        {msg.message && (
                                          <p className="whitespace-pre-wrap mt-2 px-0.5">{renderFormattedMessageText(msg.message)}</p>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {/* Message Text */}
                                        {msg.message && (
                                          <p className="whitespace-pre-wrap">{renderFormattedMessageText(msg.message)}</p>
                                        )}

                                        {/* Non-Image File Attachment */}
                                        {msg.attachment && (
                                          <div className="mt-2 rounded-xl overflow-hidden bg-slate-50 p-2 border border-slate-200">
                                            <a 
                                              href={msg.attachment.url} 
                                              download={msg.attachment.name} 
                                              target="_blank" 
                                              rel="noreferrer"
                                              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-800"
                                            >
                                              <FileText className="h-5 w-5 text-purple-600 shrink-0" />
                                              <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                                                <p className="text-[9px] text-slate-500 font-medium">{formatFileSize(msg.attachment.size)}</p>
                                              </div>
                                              <Download className="h-4 w-4 shrink-0 text-slate-500" />
                                            </a>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* WhatsApp Style Bottom Right Time & Pin Indicator */}
                                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-medium select-none">
                                      {pinnedMsgIds.includes(msg.id) && (
                                        <span title="Pesan Disematkan">
                                          <Pin className="h-3 w-3 fill-purple-600 text-purple-600 shrink-0 mr-0.5" />
                                        </span>
                                      )}
                                      {msg.is_edited && <span className="italic font-bold text-purple-600 mr-0.5">(edited)</span>}
                                      <span>{formatTime(msg.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ));
              })()
            )}

            <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* INPUT AREA CONTAINER WITH @ MENTION & ATTACHMENT DROPDOWNS (ONLY SHOWN IN CHAT TAB) */}
        {activeTab === 'chat' && (
          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 relative">
            <div className={`w-full relative ${layoutMode === 'full' ? 'max-w-4xl sm:max-w-[60%] mx-auto' : ''}`}>
              {/* Floating Scroll to Bottom Button (WhatsApp Style - Positioned directly above input box) */}
            {showScrollBottomBtn && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute -top-14 right-5 z-40 flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-white text-slate-700 shadow-2xl border border-slate-200/90 hover:bg-purple-50 hover:text-purple-700 hover:scale-105 active:scale-95 transition-all cursor-pointer group animate-in fade-in zoom-in-95 duration-150"
                title="Gulir ke paling bawah"
              >
                <ChevronDown className="h-6 w-6 text-purple-700 transition-transform group-hover:translate-y-0.5" />
                {unreadBelowCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-md ring-2 ring-white animate-in zoom-in-50 duration-150">
                    {unreadBelowCount > 99 ? '99+' : unreadBelowCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Reply Message Preview Banner */}
            {replyToMsg && (
              <div className="flex items-center justify-between p-2 mb-2 rounded-xl bg-purple-50 border-l-4 border-purple-600 text-xs shadow-2xs">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900 text-[11px]">
                    <Reply className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                    <span>Membalas {(replyToMsg.sender_username && replyToMsg.sender_username.toLowerCase() === currentUsername.toLowerCase()) ? 'Anda' : (replyToMsg.sender_name || 'Admin')}</span>
                  </div>
                  <p className="text-slate-600 truncate text-[11px] mt-0.5 font-normal">
                    {replyToMsg.message || (replyToMsg.attachment ? `[File: ${replyToMsg.attachment.name}]` : '')}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setReplyToMsg(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="Batal Balas"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Edit Message Banner */}
            {editingMsgId && (
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                <span className="font-bold flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5 text-purple-700" />
                  <span>Mengedit Pesan...</span>
                </span>
                <button 
                  type="button" 
                  onClick={handleCancelEdit}
                  className="text-purple-700 hover:text-purple-900 font-bold text-[11px] underline cursor-pointer"
                >
                  Batal Edit
                </button>
              </div>
            )}

            {/* Pending Attachment Preview Banner */}
            {pendingAttachment && (
              <div className="flex items-center justify-between p-2 mb-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {pendingAttachment.type === 'image' ? (
                    <img src={pendingAttachment.url} alt="" className="h-8 w-8 object-cover rounded-lg shrink-0" />
                  ) : (
                    <Paperclip className="h-5 w-5 text-purple-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{pendingAttachment.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatFileSize(pendingAttachment.size)}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setPendingAttachment(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* @ Mention Suggestion Popover Menu */}
            {showMentionMenu && (
              <div 
                ref={mentionMenuRef}
                className="absolute bottom-full left-4 right-4 mb-2 z-50 max-h-56 overflow-y-auto overscroll-contain rounded-2xl bg-white p-2 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-purple-700 uppercase tracking-wider border-b border-slate-100 mb-1">
                  <AtSign className="h-3 w-3" />
                  <span>Sebut Admin atau Email</span>
                </div>
                {filteredMentions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">Admin/Email tidak ditemukan</p>
                ) : (
                  filteredMentions.map((item, idx) => {
                    const isSelected = idx === mentionSelectedIndex;
                    return (
                      <button
                        key={`${item.type}_${item.id}_${idx}`}
                        type="button"
                        data-mention-index={idx}
                        onClick={() => handleSelectMention(item.display)}
                        onMouseEnter={() => setMentionSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-purple-100 text-purple-950 font-semibold ring-1 ring-purple-300 shadow-xs' 
                            : 'hover:bg-purple-50/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type === 'role' ? '@' : (item.email ? item.email[0].toUpperCase() : 'U')}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${
                              isSelected ? 'text-purple-950' : 'text-slate-800 group-hover:text-purple-900'
                            }`}>
                              {item.display}
                            </p>
                            {item.type !== 'role' && item.name && (
                              <p className="text-[10px] text-slate-500 truncate">{item.name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ml-2 ${
                          isSelected ? 'bg-purple-200 text-purple-900' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.role}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <form 
              onSubmit={handleSendMessage}
              className="relative flex items-end gap-1 sm:gap-1.5 bg-slate-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/40 border border-slate-200/90 rounded-[28px] p-1.5 sm:p-2 shadow-2xs transition-all"
            >
              {/* Left Attachment (+) Button & Popover */}
              <div className="relative shrink-0 pb-0.5" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu);
                    setShowEmojiPicker(false);
                  }}
                  disabled={isCompressing}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
                  title="Tambah Lampiran File atau Gambar"
                >
                  <Plus className="h-5 w-5" />
                </button>

                {/* Attachment Options Popover */}
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 z-50 w-64 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
                    {/* Option 1: File */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        rawFileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">File Dokumen</p>
                        <p className="text-[10px] text-slate-400">PDF, Word, Excel, Gambar</p>
                      </div>
                    </button>

                    {/* Option 2: Gambar */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        imageFileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Gambar</p>
                        <p className="text-[10px] text-slate-400">Upload foto atau gambar</p>
                      </div>
                    </button>

                    {/* Option 3: Kamera */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        handleOpenCamera();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer group border-t border-slate-100 mt-1 pt-2.5"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Kamera</p>
                        <p className="text-[10px] text-slate-400">Buka kamera & ambil foto</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Emoji Button & WhatsApp-Style Popover */}
              <div className="relative shrink-0 pb-0.5" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowAttachMenu(false);
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
                    showEmojiPicker ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                  }`}
                  title="Pilih Emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {/* WhatsApp Style Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-50 w-72 sm:w-80 rounded-2xl bg-white p-3 shadow-2xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-100 space-y-2">
                    {/* Search Bar */}
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        placeholder="Cari Emoji..."
                        className="w-full rounded-xl bg-slate-100/90 py-1.5 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      {emojiSearch && (
                        <button
                          type="button"
                          onClick={() => setEmojiSearch('')}
                          className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category Tabs */}
                    {!emojiSearch && (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 pt-0.5 overflow-x-auto scrollbar-none text-xs gap-1">
                        {EMOJI_CATEGORIES.map((cat) => {
                          const isActive = activeEmojiCategory === cat.id;
                          const icon = cat.id === 'recents' ? '🕒' : cat.emojis[0];
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setActiveEmojiCategory(cat.id)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer text-base shrink-0 ${
                                isActive ? 'bg-emerald-100/90 text-emerald-900 ring-1 ring-emerald-500/80 scale-110 font-bold' : 'hover:bg-slate-100 opacity-70 hover:opacity-100'
                              }`}
                              title={cat.name}
                            >
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Emoji Display Grid */}
                    <div className="max-h-56 overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
                      {emojiSearch ? (
                        /* Search Results */
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                            Hasil Pencarian
                          </p>
                          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                            {EMOJI_CATEGORIES.flatMap(c => c.emojis)
                              .filter((e, idx, self) => self.indexOf(e) === idx)
                              .slice(0, 80)
                              .map((emoji, i) => (
                                <button
                                  key={`search_${i}_${emoji}`}
                                  type="button"
                                  onClick={() => handleInsertEmoji(emoji)}
                                  className="text-xl p-1.5 rounded-lg hover:bg-emerald-50 hover:scale-125 active:scale-95 transition-all cursor-pointer flex items-center justify-center select-none"
                                >
                                  {emoji}
                                </button>
                              ))}
                          </div>
                        </div>
                      ) : (
                        /* Categorized View */
                        <div className="space-y-2">
                          {EMOJI_CATEGORIES.filter(c => c.id === activeEmojiCategory).map((category) => {
                            const list = category.id === 'recents' ? getRecentEmojis() : category.emojis;
                            return (
                              <div key={category.id}>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">
                                  {category.name}
                                </p>
                                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                                  {list.map((emoji, i) => (
                                    <button
                                      key={`${category.id}_${i}_${emoji}`}
                                      type="button"
                                      onClick={() => handleInsertEmoji(emoji)}
                                      className="text-xl p-1.5 rounded-lg hover:bg-emerald-50 hover:scale-125 active:scale-95 transition-all cursor-pointer flex items-center justify-center select-none"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Single-Line Textarea Input (Auto expands up to 7 lines max ~160px height, then scrollable) */}
              <div className="flex-1 min-w-0 py-1">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => {
                    handleInputChange(e);
                    autoResizeTextarea();
                  }}
                  onKeyDown={(e) => {
                    if (showMentionMenu && filteredMentions.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setMentionSelectedIndex((prev) => (prev + 1) % filteredMentions.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setMentionSelectedIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                        return;
                      }
                      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
                        e.preventDefault();
                        const target = filteredMentions[mentionSelectedIndex] || filteredMentions[0];
                        if (target) {
                          handleSelectMention(target.display);
                        }
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowMentionMenu(false);
                        return;
                      }
                    }

                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ketik pesan..."
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none font-normal leading-relaxed max-h-[160px] overflow-y-hidden"
                />
              </div>

              {/* Right Send Button */}
              <div className="shrink-0 pb-0.5">
                <button
                  type="submit"
                  disabled={isCompressing || (!inputText.trim() && !pendingAttachment && !editingMsgId)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Kirim Pesan"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>

            {layoutMode === 'full' && (
              <p className="text-[11px] text-slate-400 text-center mt-2.5 font-medium select-none">
                Informasi dari AI mungkin tidak akurat
              </p>
            )}
            </div>
          </div>
        )}

        {/* MEDIA ACTION PANEL (Panel Aksi) - Appears at the bottom when in multi-select mode OR when a single item is highlighted */}
        {selectedMediaIds.length > 0 ? (
          /* Mode Pilih Banyak (Multi-Select Action Panel) */
          <div className="p-3 bg-white border-t border-purple-200/80 shadow-2xl animate-in slide-in-from-bottom duration-200 shrink-0 relative z-30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white font-bold">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {selectedMediaIds.length} File Dipilih
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMediaIds([])}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer font-semibold"
              >
                Batal Pilih
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Tombol Download Banyak */}
              <button
                type="button"
                onClick={() => {
                  const selectedMsgs = messages.filter(m => selectedMediaIds.includes(m.id) && m.attachment?.url);
                  selectedMsgs.forEach((msg, idx) => {
                    setTimeout(() => {
                      if (msg.attachment) {
                        handleDownloadImage(msg.attachment.url, msg.attachment.name);
                      }
                    }, idx * 250);
                  });
                  showToast(`Mengunduh ${selectedMsgs.length} file...`);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-all cursor-pointer border border-blue-200 shadow-2xs"
              >
                <Download className="h-4 w-4 shrink-0 text-blue-600" />
                <span>Download ({selectedMediaIds.length})</span>
              </button>

              {/* Tombol Hapus Banyak */}
              <button
                type="button"
                onClick={() => setShowDeleteMediaModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all cursor-pointer border border-rose-200 shadow-2xs"
              >
                <Trash2 className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Hapus ({selectedMediaIds.length})</span>
              </button>
            </div>
          </div>
        ) : selectedMediaId && selectedMediaMsg && selectedMediaMsg.attachment ? (
          /* Mode Sorot 1 File (Single Item Highlighted Panel) */
          <div className="p-3 bg-white border-t border-purple-200/80 shadow-2xl animate-in slide-in-from-bottom duration-200 shrink-0 relative z-30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[260px]">
                    {selectedMediaMsg.attachment.name || 'File Disorot'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(selectedMediaMsg.attachment.size)} • Oleh {selectedMediaMsg.sender_name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMediaId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Batal Sorot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 5 Action Buttons Row */}
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              {/* 1. Download */}
              <button
                type="button"
                onClick={() => {
                  if (selectedMediaMsg.attachment) {
                    handleDownloadImage(selectedMediaMsg.attachment.url, selectedMediaMsg.attachment.name);
                    showToast(`Mengunduh ${selectedMediaMsg.attachment.name}...`);
                  }
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-all cursor-pointer group border border-slate-100 hover:border-blue-200"
                title="Download File"
              >
                <Download className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-blue-600" />
                <span className="text-[10px] font-bold">Download</span>
              </button>

              {/* 2. Tandai */}
              <button
                type="button"
                onClick={() => {
                  const isStarred = starredMediaIds.includes(selectedMediaMsg.id);
                  if (isStarred) {
                    setStarredMediaIds(prev => prev.filter(id => id !== selectedMediaMsg.id));
                    showToast("Tanda file dihapus");
                  } else {
                    setStarredMediaIds(prev => [...prev, selectedMediaMsg.id]);
                    showToast("File berhasil ditandai ⭐");
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer group border ${
                  starredMediaIds.includes(selectedMediaMsg.id)
                    ? 'bg-amber-100/90 text-amber-900 font-bold border-amber-300'
                    : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-100'
                }`}
                title="Tandai / Favoritkan"
              >
                <Star className={`h-4 w-4 mb-1 group-hover:scale-110 transition-transform ${starredMediaIds.includes(selectedMediaMsg.id) ? 'fill-amber-500 text-amber-500' : 'text-amber-600'}`} />
                <span className="text-[10px] font-bold">
                  {starredMediaIds.includes(selectedMediaMsg.id) ? 'Ditandai' : 'Tandai'}
                </span>
              </button>

              {/* 3. Pilih Ini (Masuk Mode Multi-Select) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMediaIds([selectedMediaMsg.id]);
                  setSelectedMediaId(null);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 transition-all cursor-pointer group border border-slate-100 hover:border-purple-200"
                title="Pilih File Ini untuk Mode Multi-Select"
              >
                <Check className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-purple-600" />
                <span className="text-[10px] font-bold">Pilih Ini</span>
              </button>

              {/* 4. Tampilkan di chat */}
              <button
                type="button"
                onClick={() => {
                  handleShowInChat(selectedMediaMsg.id);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-all cursor-pointer group border border-slate-100 hover:border-emerald-200"
                title="Buka lokasi pesan file ini di percakapan chat"
              >
                <MessageSquare className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-emerald-600" />
                <span className="text-[10px] font-bold text-center leading-none">Ke Chat</span>
              </button>

              {/* 5. Hapus (Paling Kanan) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMediaIds([selectedMediaMsg.id]);
                  setShowDeleteMediaModal(true);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-all cursor-pointer group border border-slate-100 hover:border-rose-200"
                title="Hapus File Ini"
              >
                <Trash2 className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-rose-600" />
                <span className="text-[10px] font-bold text-center leading-none">Hapus</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Toast Alert Notification Banner */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[250] max-w-[90%] px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-slate-300" />
            </button>
          </div>
        )}
      </div>

      {/* PIN DURATION SELECTION MODAL POPUP */}
      {pinDurationModalMsgId && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 pointer-events-auto"
          onClick={() => setPinDurationModalMsgId(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-xs sm:max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shrink-0">
                  <Pin className="h-4 w-4 fill-purple-600 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sematkan Pesan</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Pilih durasi sematan pesan ini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPinDurationModalMsgId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 py-1">
              {[
                { id: '24h', label: '24 Jam', desc: 'Disematkan selama 24 jam' },
                { id: '7d', label: '7 Hari', desc: 'Disematkan selama 7 hari' },
                { id: '30d', label: '30 Hari', desc: 'Disematkan selama 30 hari' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setSelectedPinDuration(opt.id as any)}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedPinDuration === opt.id
                      ? 'border-purple-600 bg-purple-50/80 text-purple-950 shadow-xs ring-1 ring-purple-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="pinDuration"
                    value={opt.id}
                    checked={selectedPinDuration === opt.id}
                    onChange={() => setSelectedPinDuration(opt.id as any)}
                    className="mt-0.5 accent-purple-600 h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight">{opt.label}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 font-medium">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPinDurationModalMsgId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPinWithDuration}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Pin className="h-3.5 w-3.5 fill-white" />
                <span>Sematkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Message Deletion */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto">
          <div className="bg-white rounded-2xl p-5 max-w-xs sm:max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl shrink-0 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Hapus Pesan</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteId) {
                    handleDeleteMessage(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Media Deletion */}
      {showDeleteMediaModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto">
          <div className="bg-white rounded-2xl p-5 max-w-xs sm:max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl shrink-0 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Hapus {selectedMediaIds.length} Media Selected</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus {selectedMediaIds.length} media yang dipilih? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteMediaModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteMediaModal(false);
                  await handleDeleteMultipleMessages(selectedMediaIds);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs for Attachment Uploads */}
      <input
        ref={rawFileInputRef}
        type="file"
        onChange={handleRawFileUpload}
        className="hidden"
      />
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleCompressedImageUpload}
        className="hidden"
      />
      <input
        ref={cameraFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCompressedImageUpload}
        className="hidden"
      />

      {/* CAMERA CAPTURE MODAL */}
      {showCameraModal && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150 pointer-events-auto"
          onClick={handleCloseCameraModal}
        >
          <div 
            className="bg-white rounded-3xl p-4 sm:p-5 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Kamera</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Ambil foto untuk dikirim sebagai lampiran chat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Preview / Video Canvas */}
            <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[260px] sm:min-h-[320px] shadow-inner">
              {capturedImageDataUrl ? (
                /* Captured Image Preview */
                <img 
                  src={capturedImageDataUrl} 
                  alt="Hasil Kamera" 
                  className="w-full h-full max-h-[320px] object-contain rounded-2xl"
                />
              ) : cameraError ? (
                /* Error State */
                <div className="p-6 text-center text-white space-y-3">
                  <Camera className="h-10 w-10 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-200 font-semibold">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => cameraFileInputRef.current?.click()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Gunakan Kamera Perangkat</span>
                  </button>
                </div>
              ) : (
                /* Live Stream Video */
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[320px] object-cover rounded-2xl"
                  />
                  {/* Camera Switch Facing Mode Button */}
                  <button
                    type="button"
                    onClick={handleToggleCameraFacingMode}
                    className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all cursor-pointer shadow-md"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between pt-1">
              {capturedImageDataUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCapturedImageDataUrl(null)}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Foto Ulang</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCameraPhoto}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Gunakan Foto Ini</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseCameraModal}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  {!cameraError && (
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Ambil Foto</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Image Lightbox Preview Modal with Download Button */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200 pointer-events-auto"
          onClick={() => setPreviewImageModal(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Title, Download Button, and Close Button */}
            <div className="w-full flex items-center justify-between mb-3 text-white">
              <span className="text-xs font-semibold truncate max-w-xs sm:max-w-md bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                {previewImageModal.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadImage(previewImageModal.url, previewImageModal.name)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40 max-h-[80vh] overflow-y-auto overscroll-contain flex items-center justify-center">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.name}
                className="max-h-[80vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
