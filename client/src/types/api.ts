// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  identifier: string;  // username or email
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  acceptedTerms: boolean;
  confirmedAge: boolean;
}

export interface AccountSummary {
  id: number;
  username: string;
  email: string;
  displayName: string;
  profileImageUrl: string | null;
  role: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  account: AccountSummary;
}

export type MfaMethod = 'EMAIL' | 'TOTP' | 'RECOVERY';

export interface LoginResponse {
  status: 'AUTHENTICATED' | 'MFA_REQUIRED';
  accessToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
  account?: AccountSummary;
  mfaToken?: string;
  methods?: MfaMethod[];
}

export interface TotpSetupResponse {
  secret: string;
  qrDataUri: string;
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface MyAccountResponse {
  id: number;
  username: string;
  email: string;
  phone?: string;
  displayName?: string;
  bio?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  coverPosition: number;
  role: string;
  emailVerified: boolean;
  mfaEmailEnabled: boolean;
  mfaTotpEnabled: boolean;
  joinedAt: string;
}

export interface PublicAccountResponse {
  id: number;
  username: string;
  displayName?: string;
  bio?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  coverPosition: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  emailVerified: boolean;
  joinedAt: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  coverPosition?: number;
}

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
  parentPostId?: number;
}

export interface UpdatePostRequest {
  content: string;
  imageUrl?: string;
}

export type ModerationStatus = 'PENDING' | 'CLEAN' | 'FLAGGED';
export type AdminStatus = 'ACTIVE' | 'REMOVED_BY_ADMIN' | 'RESTORED_BY_ADMIN';

export interface PostResponse {
  id: number;
  content: string;
  imageUrl?: string;
  author: PublicAccountResponse;
  createdAt: string;
  updatedAt: string;
  parentPostId?: number;
  parentPostAuthorUsername?: string;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  likedByMe: boolean;
  repostedByMe: boolean;
  quotedPost?: PostResponse;
  moderationStatus: ModerationStatus;
  adminStatus: AdminStatus;
  isEdited: boolean;
}

export interface FeedItemResponse {
  type: 'POST' | 'REPOST';
  repostedAt: string;
  reposter?: PublicAccountResponse;
  post: PostResponse;
}

export interface CreateQuoteRepostRequest {
  content: string;
  imageUrl?: string;
  quotedPostId: number;
}

// ─── Notification ──────────────────────────────────────────────

export type NotificationType = 'LIKE' | 'FOLLOW' | 'REPLY' | 'MENTION' | 'REPOST' | 'QUOTE_REPOST' | 'MODERATION_ALERT' | 'RECOMMENDATION';

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  actor: PublicAccountResponse;
  referenceId: number | null;
  count: number;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Messages ──────────────────────────────────────────────────

export interface ConversationResponse {
  id: number;
  otherParticipant: PublicAccountResponse;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface SharedPostPreview {
  id: number;
  author: PublicAccountResponse;
  contentSnippet: string | null;
  imageUrl: string | null;
}

export interface MessageResponse {
  id: number;
  conversationId: number;
  sender: PublicAccountResponse;
  content: string | null;
  imageUrl?: string | null;
  sharedPost?: SharedPostPreview | null;
  readAt: string | null;
  createdAt: string;
  isOptimistic?: boolean;
}

export interface CombinedSearchResponse {
  users: PublicAccountResponse[];
  posts: PostResponse[];
}

export interface ReadReceiptPayload {
  conversationId: number;
  readAt: string;
}

// ─── Common ───────────────────────────────────────────────────────────────────

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ErrorResponse {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  fieldErrors: Record<string, string> | null;
}

export interface CursorPageResponse<T> {
  content: T[];
  nextCursor: number | null;
  hasMore: boolean;
}
