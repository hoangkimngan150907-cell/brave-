import React, { useEffect, useState } from 'react';
import {
  Ban,
  Flame,
  Flag,
  Heart,
  MessageSquare,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type {
  ChallengeGroup,
  CommunityPost,
  Language,
} from '../types/brave';

export const CommunityScreen: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = getT(lang);
  const [tab, setTab] = useState<'feed' | 'groups'>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [groups, setGroups] = useState<ChallengeGroup[]>([]);
  const [content, setContent] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const loadFeed = async () => {
    const data = await apiRequest<{
      posts: CommunityPost[];
      groups: ChallengeGroup[];
    }>('/api/community/feed');
    setPosts(data.posts);
    setGroups(data.groups);
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPublishing(true);
    try {
      await apiRequest('/api/community/posts', {
        method: 'POST',
        body: JSON.stringify({
          content,
          challengeTitle: challengeTitle || null,
          category: challengeTitle ? 'achievement' : 'story',
        }),
      });
      setContent('');
      setChallengeTitle('');
      await loadFeed();
    } finally {
      setPublishing(false);
    }
  };

  const handleReact = async (
    postId: number,
    reactionType: 'courage' | 'warmth' | 'inspire'
  ) => {
    await apiRequest(`/api/community/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reactionType }),
    });
    await loadFeed();
  };

  const handleComment = async (postId: number) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    await apiRequest(`/api/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    await loadFeed();
  };

  const handleFollow = async (targetUserId: number) => {
    await apiRequest(`/api/community/follow/${targetUserId}`, {
      method: 'POST',
    });
    await loadFeed();
  };

  const handleReport = async (postId: number) => {
    await apiRequest(`/api/community/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Community guideline review' }),
    });
    setNotice(t.community.reportedMsg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleBlock = async (targetUserId: number) => {
    await apiRequest(`/api/community/block/${targetUserId}`, {
      method: 'POST',
    });
    await loadFeed();
  };

  const handleDeletePost = async (postId: number) => {
    await apiRequest(`/api/community/posts/${postId}`, { method: 'DELETE' });
    await loadFeed();
  };

  const toggleGroup = async (groupId: number) => {
    await apiRequest(`/api/community/groups/${groupId}/toggle`, {
      method: 'POST',
    });
    await loadFeed();
  };

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-[#EADBD5]">
        <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
          {t.community.title}
        </h1>
        <p className="text-sm text-[#987D77] mt-1 max-w-2xl">
          {t.community.subtitle}
        </p>

        <div className="mt-5 inline-flex items-center gap-1 p-1 rounded-full bg-[#FFFAF7] border border-[#EADBD5]">
          <button
            type="button"
            onClick={() => setTab('feed')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium cursor-pointer ${
              tab === 'feed'
                ? 'bg-[#C98585] text-[#FFFAF7]'
                : 'text-[#987D77] hover:text-[#493633]'
            }`}
          >
            {t.community.tabFeed}
          </button>
          <button
            type="button"
            onClick={() => setTab('groups')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium cursor-pointer ${
              tab === 'groups'
                ? 'bg-[#C98585] text-[#FFFAF7]'
                : 'text-[#987D77] hover:text-[#493633]'
            }`}
          >
            {t.community.tabGroups}
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl bg-[#FFFAF7] border border-[#C98585] px-4 py-3 text-xs text-[#493633]">
          {notice}
        </div>
      )}

      {tab === 'feed' ? (
        <div className="space-y-6 max-w-3xl">
          <form
            onSubmit={handlePublish}
            className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 space-y-4"
          >
            <textarea
              rows={3}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.community.postPlaceholder}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 p-4 text-sm text-[#493633]"
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <input
                type="text"
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                placeholder={t.community.linkedChallenge}
                className="flex-1 rounded-full border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-2.5 text-xs text-[#493633]"
              />
              <button
                type="submit"
                disabled={publishing}
                className="rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-2.5 min-h-[42px] text-xs font-medium text-[#FFFAF7] whitespace-nowrap cursor-pointer"
              >
                {t.community.publishBtn}
              </button>
            </div>
          </form>

          {posts.length === 0 ? (
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-8 text-center">
              <p className="text-sm text-[#987D77]">
                {lang === 'vi'
                  ? 'Hãy là người đầu tiên chia sẻ một khoảnh khắc can đảm hôm nay.'
                  : 'Be the first to share a quiet moment of courage today.'}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#493633]">
                      {post.author.fullName || 'Brave Member'}
                      {post.author.username && (
                        <span className="font-normal text-[#987D77] ml-1.5 text-xs">
                          @{post.author.username}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#987D77]">
                      {new Date(post.createdAt).toLocaleDateString()}
                      {post.challengeTitle ? ` · ${post.challengeTitle}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!post.isOwnPost ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleFollow(post.userId)}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                            post.isFollowingAuthor
                              ? 'border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
                              : 'border-[#EADBD5] text-[#987D77]'
                          }`}
                        >
                          {post.isFollowingAuthor ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {post.isFollowingAuthor
                              ? t.community.following
                              : t.community.follow}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReport(post.id)}
                          title={t.community.report}
                          className="p-2 text-[#987D77] hover:text-[#493633] cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBlock(post.userId)}
                          title={t.community.block}
                          className="p-2 text-[#987D77] hover:text-[#493633] cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        aria-label="Delete post"
                        className="p-2 text-[#987D77] hover:text-[#493633] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-[#493633]/90 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {/* Reactions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EADBD5]">
                  {(
                    [
                      { key: 'courage', icon: Flame, label: t.community.reactions.courage },
                      { key: 'warmth', icon: Heart, label: t.community.reactions.warmth },
                      { key: 'inspire', icon: Sparkles, label: t.community.reactions.inspire },
                    ] as const
                  ).map(({ key, icon: Icon, label }) => {
                    const active = post.myReaction === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleReact(post.id, key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                          active
                            ? 'border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
                            : 'border-[#EADBD5] bg-[#F7EEE9]/50 text-[#987D77] hover:text-[#493633]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-[#C98585]" />
                        <span>
                          {label} · {post.reactionCounts[key]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Comments */}
                <div className="space-y-3 pt-2">
                  {post.comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl bg-[#F7EEE9]/70 px-4 py-2.5 text-xs text-[#493633]"
                    >
                      <span className="font-semibold">
                        {c.author.fullName || 'Member'}
                      </span>{' '}
                      <span className="text-[#493633]/85">{c.content}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#987D77] shrink-0" />
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder={t.community.commentPlaceholder}
                      className="flex-1 rounded-full border border-[#EADBD5] bg-[#F7EEE9]/50 px-4 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleComment(post.id)}
                      className="rounded-full bg-[#C98585] px-4 py-2 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                    >
                      {t.community.sendComment}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {groups.map((g) => (
            <div
              key={g.id}
              className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#987D77] mb-2 tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C98585]" />
                    {g.memberCount} {t.community.members}
                  </span>
                </div>
                <h3 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                  {lang === 'vi' ? g.nameVi : g.nameEn}
                </h3>
                <p className="text-sm text-[#987D77] mt-2 leading-relaxed">
                  {lang === 'vi' ? g.descriptionVi : g.descriptionEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={`self-start rounded-full px-5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  g.joined
                    ? 'border border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
                    : 'bg-[#C98585] text-[#FFFAF7]'
                }`}
              >
                {g.joined ? t.community.joinedGroup : t.community.joinGroup}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
