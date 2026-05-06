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
}

export interface RefreshRequest {
  refreshToken: string;
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
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  account: AccountSummary;
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
  role: string;
  emailVerified: boolean;
  joinedAt: string;
}

export interface PublicAccountResponse {
  id: number;
  username: string;
  displayName?: string;
  bio?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  emailVerified: boolean;
  joinedAt: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
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

export interface PostResponse {
  id: number;
  content: string;
  imageUrl: string | null;
  author: PublicAccountResponse;
  parentPostId: number | null;
  parentPostAuthorUsername: string | null;
  quotedPost?: PostResponse;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  repostCount: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
  repostedByMe: boolean;
  createdAt: string;
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

export type NotificationType = 'LIKE' | 'FOLLOW' | 'REPLY' | 'MENTION';

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  actor: PublicAccountResponse;
  referenceId: number | null;
  readAt: string | null;
  createdAt: string;
}

// ─── Messages ──────────────────────────────────────────────────

export interface ConversationResponse {
  id: number;
  otherParticipant: PublicAccountResponse;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageResponse {
  id: number;
  conversationId: number;
  sender: PublicAccountResponse;
  content: string;
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
