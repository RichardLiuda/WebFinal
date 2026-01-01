document.addEventListener('DOMContentLoaded', () => {
  // 标签筛选状态管理
  const state = {
    filterTags: [],
  };
  
  // 从URL参数获取要查看的用户ID
  const urlParams = new URLSearchParams(window.location.search);
  const profileUserId = urlParams.get('id');
  
  // 获取当前用户
  const currentUser = window.DB.ctx();
  
  // 如果没有id参数且未登录，跳转到登录页面
  if (!profileUserId && !currentUser) {
    window.location.href = 'auth.html';
    return;
  }
  
  // 确定要显示的用户ID：如果有id参数则使用id参数，否则使用当前用户ID
  const displayUserId = profileUserId || currentUser.id;
  const isOwnProfile = currentUser && String(displayUserId) === String(currentUser.id);

  // DOM元素
  const profileAvatar = document.getElementById('profile-avatar');
  const profileName = document.getElementById('profile-name');
  const profileBio = document.getElementById('profile-bio');
  const postsCount = document.getElementById('posts-count');
  const followingCount = document.getElementById('following-count');
  const followersCount = document.getElementById('followers-count');
  const followBtn = document.getElementById('follow-btn');
  const messageBtn = document.getElementById('message-btn');
  const profileTabs = document.getElementById('profile-tabs');
  const panelPosts = document.getElementById('panel-posts');
  const panelFollowing = document.getElementById('panel-following');
  const panelFollowers = document.getElementById('panel-followers');
  const postsContainer = document.getElementById('posts-container');
  const followingContainer = document.getElementById('following-container');
  const followersContainer = document.getElementById('followers-container');

  // 初始化个人资料页面
  async function initProfile() {
    loadProfileData();
    loadProfilePosts();
    setupFollowButton();
    setupTabs();
    setupProfileMoreButton();
    initProfileTagFilter();
    initUserSearch();
    
    // 如果是自己的个人资料，隐藏关注和消息按钮
    if (isOwnProfile) {
      followBtn.style.display = 'none';
      messageBtn.style.display = 'none';
    } else {
      // 如果不是自己的个人资料，隐藏悬浮添加按钮
      const fabBtn = document.querySelector('.fab');
      if (fabBtn) {
        fabBtn.style.display = 'none';
      }
    }
  }
  
  // 用户搜索功能
  function initUserSearch() {
    const userSearchInput = document.getElementById('user-search-input');
    const userSearchBtn = document.getElementById('user-search-btn');
    const searchResultCount = document.getElementById('search-result-count');
    
    // 搜索函数
    function searchUsers() {
      const searchQuery = userSearchInput.value.trim().toLowerCase();
      const activeTab = document.querySelector('#profile-tabs md-primary-tab[active]');
      const tabType = activeTab.getAttribute('data-tab');
      
      if (tabType === 'following') {
        loadFollowingList(searchQuery);
      } else if (tabType === 'followers') {
        loadFollowersList(searchQuery);
      }
      
      // 更新搜索结果数量显示
      const visibleUsers = document.querySelectorAll(`${tabType === 'following' ? '#following-container' : '#followers-container'} .user-item`);
      const count = visibleUsers.length;
      searchResultCount.textContent = count > 0 ? `${count} result${count !== 1 ? 's' : ''}` : 'No results';
    }
    
    // 搜索按钮点击事件
    if (userSearchBtn) {
      userSearchBtn.addEventListener('click', searchUsers);
    }
    
    // 输入框回车事件
    if (userSearchInput) {
      userSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          searchUsers();
        }
      });
    }
  }
  
  // 标签筛选功能
  function initProfileTagFilter() {
    const tagInput = document.getElementById('tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsList = document.getElementById('tags-list');
    const clearTagsBtn = document.getElementById('clear-tags-btn');

    // 渲染当前标签列表
    function renderTags() {
      tagsList.innerHTML = '';
      state.filterTags.forEach((tag, index) => {
        const tagElement = document.createElement('div');
        tagElement.className = 'filter-tag-pill';
        tagElement.innerHTML = `
          <span>${tag}</span>
          <md-icon-button class="remove-tag-btn" aria-label="Remove tag" data-index="${index}">
            <md-icon>close</md-icon>
          </md-icon-button>
        `;
        tagsList.appendChild(tagElement);
      });
    }

    // 添加标签
    function addTag(tag) {
      tag = tag.trim().toLowerCase();
      if (!tag) return;
      tag = "#" + tag;
      if (!state.filterTags.includes(tag)) {
        state.filterTags.push(tag);
        renderTags();
        loadProfilePosts();
        tagInput.value = '';
      }
    }

    // 删除标签
    function removeTag(index) {
      state.filterTags.splice(index, 1);
      renderTags();
      loadProfilePosts();
    }

    // 清空所有标签
    function clearAllTags() {
      state.filterTags = [];
      renderTags();
      loadProfilePosts();
    }

    // 添加标签按钮事件
    if (addTagBtn) {
      addTagBtn.addEventListener('click', () => {
        const tag = tagInput.value.trim();
        addTag(tag);
      });
    }

    // 输入框回车事件
    if (tagInput) {
      tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const tag = tagInput.value.trim();
          addTag(tag);
        }
      });
    }

    // 清空所有标签按钮事件
    if (clearTagsBtn) {
      clearTagsBtn.addEventListener('click', clearAllTags);
    }

    // 标签删除按钮事件委托
    if (tagsList) {
      tagsList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-tag-btn');
        if (removeBtn) {
          e.stopPropagation();
          const index = parseInt(removeBtn.dataset.index, 10);
          removeTag(index);
        }
      });
    }

    // 初始渲染标签列表
    renderTags();
  }

  // 加载个人资料数据
  function loadProfileData() {
    const user = window.DB.getUserById(displayUserId);
    if (!user) {
      console.error('User not found');
      return;
    }

    // 更新UI
    profileAvatar.src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname || user.id}`;
    profileName.textContent = user.nickname || user.id;
    profileBio.textContent = user.bio || 'No bio available.';
    postsCount.textContent = user.stats?.posts || 0;
    followingCount.textContent = user.stats?.following || 0;
    followersCount.textContent = user.stats?.followers || 0;
  }

  // 设置关注按钮
  function setupFollowButton() {
    if (isOwnProfile) return;

    updateFollowButton();
    followBtn.addEventListener('click', toggleFollow);
  }

  // 更新关注按钮状态
  function updateFollowButton() {
    const isFollowing = window.DB.isFollowing(displayUserId);
    followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
    followBtn.style.backgroundColor = isFollowing ? 'var(--md-sys-color-surface-container)' : '';
    followBtn.style.color = isFollowing ? 'var(--md-sys-color-on-surface)' : '';
  }

  // 切换关注状态
  function toggleFollow() {
    const isFollowing = window.DB.isFollowing(displayUserId);
    window.DB.toggleFollow(displayUserId);
    updateFollowButton();
    loadProfileData(); // 更新关注者数量
  }

  // 设置标签页
  function setupTabs() {
    const tabs = profileTabs.querySelectorAll('md-primary-tab');
    
    // 当不是自己的个人资料页面时，不显示following和followers标签页
    if (!isOwnProfile) {
      const tabFollowing = document.querySelector('md-primary-tab[data-tab="following"]');
      const tabFollowers = document.querySelector('md-primary-tab[data-tab="followers"]');
      if (tabFollowing) tabFollowing.style.display = 'none';
      if (tabFollowers) tabFollowers.style.display = 'none';
    }
    
    // 切换左侧菜单（标签筛选或用户搜索）
    function switchSideMenu(tabType) {
      const tagsFilterCard = document.getElementById('tags-filter-card');
      const userSearchCard = document.getElementById('user-search-card');
      
      if (tabType === 'posts') {
        tagsFilterCard.style.display = 'flex';
        userSearchCard.style.display = 'none';
      } else if (tabType === 'following' || tabType === 'followers') {
        tagsFilterCard.style.display = 'none';
        userSearchCard.style.display = 'flex';
      }
    }
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // 更新标签页状态
        tabs.forEach(t => t.removeAttribute('active'));
        tab.setAttribute('active', '');

        // 显示对应的面板
        const tabType = tab.getAttribute('data-tab');
        panelPosts.hidden = tabType !== 'posts';
        panelFollowing.hidden = tabType !== 'following';
        panelFollowers.hidden = tabType !== 'followers';

        // 切换左侧菜单
        switchSideMenu(tabType);

        // 加载对应的数据
        if (tabType === 'following') {
          loadFollowingList();
        } else if (tabType === 'followers') {
          loadFollowersList();
        }
      });
    });
  }

  // 设置个人资料更多按钮
  function setupProfileMoreButton() {
    const moreBtn = document.getElementById('more-btn');
    const moreMenu = document.getElementById('profile-more-menu');
    const editBtn = document.querySelector('.profile-edit-btn');

    if (moreBtn && moreMenu) {
      // 更多按钮点击事件
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = moreMenu.style.display === 'none' ? 'block' : 'none';
      });

      // 点击外部关闭菜单
      document.addEventListener('click', () => {
        moreMenu.style.display = 'none';
      });

      // 菜单内部点击不关闭
      moreMenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // 编辑按钮点击事件 - 只在自己的资料页面显示和功能
      if (editBtn) {
        if (isOwnProfile) {
          editBtn.addEventListener('click', () => {
            moreMenu.style.display = 'none';
            // 这里可以添加打开个人资料编辑对话框的逻辑
            openEditProfileDialog();
          });
        } else {
          // 如果不是自己的资料，隐藏编辑按钮
          editBtn.style.display = 'none';
        }
      }
    }
  }

  // 打开个人资料编辑对话框
  function openEditProfileDialog() {
    const dialog = document.getElementById('edit-profile-dialog');
    const user = window.DB.getUserById(displayUserId);
    const nicknameInput = document.getElementById('edit-profile-nickname');
    const bioInput = document.getElementById('edit-profile-bio');
    const avatarInput = document.getElementById('edit-profile-avatar');
    const saveBtn = document.getElementById('edit-profile-confirm-btn');

    if (!user) return;

    // 填充用户数据到编辑表单
    nicknameInput.value = user.nickname || '';
    bioInput.value = user.bio || '';
    avatarInput.value = user.avatar || '';

    // 打开对话框
    dialog.show();

    // 设置保存按钮事件
    saveBtn.onclick = () => {
      const updatedNickname = nicknameInput.value.trim();
      const updatedBio = bioInput.value.trim();
      const updatedAvatar = avatarInput.value.trim();

      // 准备更新的用户数据
      const updates = {};
      if (updatedNickname) updates.nickname = updatedNickname;
      if (updatedBio) updates.bio = updatedBio;
      if (updatedAvatar) updates.avatar = updatedAvatar;

      // 更新用户信息
      if (Object.keys(updates).length > 0) {
        if (window.DB.updateUser(user.id, updates)) {
          // 更新成功后刷新页面数据
          loadProfileData();
          dialog.close();
        }
      } else {
        // 没有更改，直接关闭
        dialog.close();
      }
    };
  }

  // 加载个人资料帖子
  function loadProfilePosts() {
    let posts = window.DB.getUserPosts(displayUserId);
    postsContainer.innerHTML = '';

    // 应用标签筛选
    if (state.filterTags.length > 0) {
      posts = posts.filter(post => {
        // 确保帖子有标签，并且包含所有筛选标签
        const postTags = post.tags || [];
        return state.filterTags.every(tag => postTags.includes(tag));
      });
    }

    if (posts.length === 0) {
      postsContainer.innerHTML = '<div class="empty-state">No posts yet.</div>';
      return;
    }

    posts.forEach(post => {
      const postElement = createPostElement(post);
      postsContainer.appendChild(postElement);
    });
  }

  // 创建帖子元素
  function createPostElement(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;

    const author = window.DB.getUserById(post.authorId);
    const isLiked = currentUser && post.likes.includes(currentUser.id);
    const likeIcon = isLiked ? 'favorite' : 'favorite_border';

    // 转义HTML内容
    const escapeHtml = (value) => {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    // 格式化时间
    const formatTime = (isoString) => {
      if (window.Utils && typeof window.Utils.timeAgo === 'function') {
        return window.Utils.timeAgo(isoString);
      }
      const time = new Date(isoString);
      if (Number.isNaN(time.getTime())) {
        return 'just now';
      }
      return time.toLocaleString();
    };

    const avatarHtml = (author && author.avatar) 
      ? `<img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.nickname || author.id)}" style="width:32px; height:32px; border-radius:12px; object-fit:cover;">` 
      : `<div class="brand-mark" style="width: 32px; height: 32px; font-size: 14px;">${String(author.id).substring(0,2)}</div>`;

    const imagesMarkup = (post.images || []).map(img => `<img src="${escapeHtml(img)}" style="border-radius: 12px; margin-top: 8px; max-height: 300px; object-fit: cover;">`).join('');

    const tagsMarkup = post.tags
      .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="post-header">
        ${avatarHtml}
        <div style="flex:1; margin-left: 12px;">
          <div class="post-author md-typescale-title-small">${escapeHtml(author.nickname || author.id)}</div>
          <div class="post-meta md-typescale-body-small">${escapeHtml(formatTime(post.timestamp))}</div>
        </div>
        ${currentUser && String(author.id) === String(currentUser.id) ? '<div class="post-more-container"><md-icon-button class="post-more-btn" aria-label="More options" data-post-id="' + post.id + '"><md-icon>more_vert</md-icon></md-icon-button><div class="post-more-menu" style="display: none;"><div class="post-more-item post-edit-btn" data-post-id="' + post.id + '">Edit</div><div class="post-more-item post-delete-btn" data-post-id="' + post.id + '">Delete</div></div></div>' : ''}
      </div>
      <div class="post-content md-typescale-body-medium" style="margin-top: 8px;">${escapeHtml(post.content)}
        ${imagesMarkup}
      </div>
      <div class="post-tags" style="margin-top: 8px;">${tagsMarkup}</div>
      <div class="post-actions" style="margin-top: 12px; display: flex;">
        <div>
          <md-outlined-button type="button" class="btn-like" data-id="${post.id}">
            <md-icon slot="icon">${likeIcon}</md-icon>
            ${post.likes.length}
          </md-outlined-button>
          <md-outlined-button type="button" class="btn-comment" data-id="${post.id}">
            <md-icon slot="icon">chat_bubble_outline</md-icon>
            ${post.comments.length}
          </md-outlined-button>
          <md-text-button type="button">Share</md-text-button>
        </div>
      </div>
    `;

    // 添加事件监听器
    const likeBtn = card.querySelector('.btn-like');
    const commentBtn = card.querySelector('.btn-comment');
    const moreBtn = card.querySelector('.post-more-btn');
    const moreMenu = card.querySelector('.post-more-menu');
    const editBtn = card.querySelector('.post-edit-btn');
    const deleteBtn = card.querySelector('.post-delete-btn');

    if (likeBtn) {
      likeBtn.addEventListener('click', () => toggleLike(post.id, likeBtn));
    }

    if (commentBtn) {
      commentBtn.addEventListener('click', () => openCommentDialog(post.id));
    }

    // 更多选项按钮事件
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = moreMenu.style.display === 'none' ? 'block' : 'none';
      });
    }

    // 点击外部关闭菜单
    document.addEventListener('click', () => {
      moreMenu.style.display = 'none';
    });

    // 编辑按钮事件
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = 'none';
        openEditPostDialog(post.id);
      });
    }

    // 删除按钮事件
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = 'none';
        deletePost(post.id);
      });
    }

    return card;
  }

  // 切换点赞状态
  function toggleLike(postId, likeBtn) {
    const isLiked = window.DB.toggleLike(postId);
    const likeCount = likeBtn.querySelector('span');
    const likeIcon = likeBtn.querySelector('md-icon');

    if (isLiked) {
      likeBtn.classList.add('liked');
      likeIcon.textContent = 'favorite';
      likeCount.textContent = parseInt(likeCount.textContent) + 1;
    } else {
      likeBtn.classList.remove('liked');
      likeIcon.textContent = 'favorite_border';
      likeCount.textContent = parseInt(likeCount.textContent) - 1;
    }
  }

  // 打开评论对话框
  function openCommentDialog(postId) {
    const dialog = document.getElementById('post-detail-dialog');
    const post = window.DB.getPostById(postId);
    const detailPostContainer = document.getElementById('detail-post-container');

    if (!post) return;

    // 克隆帖子元素到对话框
    const postElement = createPostElement(post);
    detailPostContainer.innerHTML = '';
    detailPostContainer.appendChild(postElement);

    // 加载评论
    loadComments(postId);

    // 打开对话框
    dialog.show();

    // 设置评论提交
    const newCommentInput = document.getElementById('new-comment-input');
    const sendCommentBtn = document.getElementById('send-comment-btn');

    sendCommentBtn.onclick = () => {
      const content = newCommentInput.value.trim();
      if (content) {
        window.DB.comment(postId, content);
        loadComments(postId);
        newCommentInput.value = '';
        // 更新原帖子的评论数
        const originalPost = document.querySelector(`[data-post-id="${postId}"]`);
        if (originalPost) {
          const commentCount = originalPost.querySelector('.action-btn[data-action="comment"] span');
          if (commentCount) {
            commentCount.textContent = parseInt(commentCount.textContent) + 1;
          }
        }
      }
    };
  }

  // 加载评论
  function loadComments(postId) {
    const commentsList = document.getElementById('comments-list');
    const post = window.DB.getPostById(postId);

    if (!post) return;

    commentsList.innerHTML = '';
    post.comments.forEach(comment => {
      const commentElement = document.createElement('div');
      const author = window.DB.getUserById(comment.authorId);

      commentElement.innerHTML = `
        <div class="comment">
          <div class="comment-author">
            <img src="${author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.nickname || author.id}`}" alt="${author.nickname || author.id}" class="comment-avatar">
            <div class="comment-info">
              <div class="comment-author-name">${author.nickname || author.id}</div>
              <div class="comment-time">${window.Utils.timeAgo(comment.timestamp)}</div>
            </div>
          </div>
          <div class="comment-content">${window.Utils.sanitize(comment.content)}</div>
        </div>
      `;
      commentsList.appendChild(commentElement);
    });
  }

  // 删除帖子
  function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
      if (window.DB.deletePost(postId)) {
        loadProfileData(); // 更新帖子数量
        loadProfilePosts(); // 重新加载帖子列表
      }
    }
  }

  // 打开编辑帖子对话框
  function openEditPostDialog(postId) {
    const dialog = document.getElementById('edit-post-dialog');
    const post = window.DB.getPostById(postId);
    const contentInput = document.getElementById('edit-post-content');
    const imageUrlInput = document.getElementById('edit-post-image-url');
    const tagsInput = document.getElementById('edit-post-tags-text');
    const saveBtn = document.getElementById('edit-confirm-btn');

    if (!post) return;

    // 填充帖子数据到编辑表单
    contentInput.value = post.content;
    imageUrlInput.value = post.images && post.images.length > 0 ? post.images[0] : '';
    tagsInput.value = post.tags ? post.tags.join(' ') : '';

    // 打开对话框
    dialog.show();

    // 设置保存按钮事件
    saveBtn.onclick = () => {
      const updatedContent = contentInput.value.trim();
      const updatedImageUrl = imageUrlInput.value.trim();
      const updatedTags = tagsInput.value.trim().split(/\s+/).filter(tag => tag);

      if (updatedContent) {
        // 准备更新的帖子数据
        const updatedPost = {
          ...post,
          content: updatedContent,
          images: updatedImageUrl ? [updatedImageUrl] : [],
          tags: updatedTags
        };

        // 更新帖子
        if (window.DB.updatePost(updatedPost)) {
          loadProfilePosts(); // 重新加载帖子列表
          dialog.close();
        }
      }
    };
  }

  // 加载关注列表
  function loadFollowingList(searchQuery = '') {
    const user = window.DB.getUserById(displayUserId);
    if (!user || !user.following || user.following.length === 0) {
      followingContainer.innerHTML = '<div class="empty-state">Not following anyone yet.</div>';
      return;
    }

    followingContainer.innerHTML = '';
    let hasResults = false;
    
    user.following.forEach(followId => {
      const followedUser = window.DB.getUserById(followId);
      if (followedUser) {
        // 检查是否匹配搜索查询
        const matchesSearch = !searchQuery || 
          followedUser.id.toLowerCase().includes(searchQuery) || 
          (followedUser.nickname && followedUser.nickname.toLowerCase().includes(searchQuery));
          
        if (matchesSearch) {
          const userElement = createUserElement(followedUser);
          followingContainer.appendChild(userElement);
          hasResults = true;
        }
      }
    });
    
    // 如果没有匹配的结果，显示空状态
    if (!hasResults) {
      followingContainer.innerHTML = '<div class="empty-state">No matching users found.</div>';
    }
  }

  // 加载粉丝列表
  function loadFollowersList(searchQuery = '') {
    const user = window.DB.getUserById(displayUserId);
    if (!user || !user.followers || user.followers.length === 0) {
      followersContainer.innerHTML = '<div class="empty-state">No followers yet.</div>';
      return;
    }

    followersContainer.innerHTML = '';
    let hasResults = false;
    
    user.followers.forEach(followerId => {
      const followerUser = window.DB.getUserById(followerId);
      if (followerUser) {
        // 检查是否匹配搜索查询
        const matchesSearch = !searchQuery || 
          followerUser.id.toLowerCase().includes(searchQuery) || 
          (followerUser.nickname && followerUser.nickname.toLowerCase().includes(searchQuery));
          
        if (matchesSearch) {
          const userElement = createUserElement(followerUser);
          followersContainer.appendChild(userElement);
          hasResults = true;
        }
      }
    });
    
    // 如果没有匹配的结果，显示空状态
    if (!hasResults) {
      followersContainer.innerHTML = '<div class="empty-state">No matching users found.</div>';
    }
  }

  // 创建用户元素
  function createUserElement(user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    const isFollowing = window.DB.isFollowing(user.id);

    userDiv.innerHTML = `
      <div class="user-info">
        <img src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname || user.id}`}" alt="${user.nickname || user.id}" class="user-avatar">
        <div class="user-details">
          <div class="user-name">${user.nickname || user.id}</div>
          <div class="user-id">${user.id}</div>
        </div>
      </div>
      ${String(user.id) !== String(currentUser.id) ? `
        <md-outlined-button class="follow-btn" data-user-id="${user.id}">
          ${isFollowing ? 'Unfollow' : 'Follow'}
        </md-outlined-button>
      ` : ''}
    `;

    // 添加关注按钮事件
    const followBtn = userDiv.querySelector('.follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        const userId = followBtn.dataset.userId;
        const isFollowing = window.DB.isFollowing(userId);
        window.DB.toggleFollow(userId);
        followBtn.textContent = isFollowing ? 'Follow' : 'Unfollow';
      });
    }

    // 添加点击用户信息跳转到个人资料
    const userInfo = userDiv.querySelector('.user-info');
    userInfo.addEventListener('click', () => {
      window.location.href = `profile.html?id=${user.id}`;
    });

    return userDiv;
  }

  // 设置底部导航栏路由跳转
  function setupBottomNav() {
    const navButtons = document.querySelectorAll('[data-route]');
    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const route = button.dataset.route;
        
        // 移除所有按钮的激活状态
        navButtons.forEach(btn => btn.classList.remove('is-active'));
        // 添加当前按钮的激活状态
        button.classList.add('is-active');
        
        // 根据路由跳转到相应页面
        switch(route) {
          case 'home':
            window.location.href = 'index.html';
            break;
          case 'post':
            // 这里可以跳转到发帖页面，或者在当前页面打开发帖对话框
            const publishDialog = document.getElementById('publish-dialog');
            if (publishDialog) {
              publishDialog.show();
            }
            break;
          case 'explore':
            // 探索页面的跳转逻辑，这里暂时跳转到首页
            window.location.href = 'index.html';
            break;
          case 'profile':
            // 当前已经在profile页面，不需要跳转
            break;
          case 'notifications':
            window.location.href = 'notifications.html';
            break;
        }
      });
    });
  }

  // 初始化页面
  initProfile();
  setupBottomNav();
  setupUserAvatarMenu();

  // 设置用户头像和菜单
  function setupUserAvatarMenu() {
    const avatarContainer = document.getElementById('user-avatar-container');
    const accountMenu = document.getElementById('account-menu');
    const menuAdmin = document.getElementById('menu-admin');
    const menuProfile = document.getElementById('menu-profile');
    const menuLogout = document.getElementById('menu-logout');

    // 更新头像和菜单UI
    function updateAvatarMenu() {
      const user = window.DB.ctx();
      if (user) {
        // 显示管理员选项（如果是管理员角色）
        if (user.role === 'admin') {
          menuAdmin.style.display = 'flex';
        } else {
          menuAdmin.style.display = 'none';
        }

        // 显示用户头像
        avatarContainer.innerHTML = `
          <img id="avatar-trigger" src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname || user.id}`}" alt="User Profile">
        `;

        // 添加头像点击事件
        document.getElementById('avatar-trigger').addEventListener('click', () => {
          accountMenu.open = !accountMenu.open;
        });
      } else {
        // 用户未登录，显示占位符头像
        avatarContainer.innerHTML = `
          <div id="avatar-trigger" class="placeholder-avatar">
            <md-icon style="width: 24px; height: 24px; color: var(--md-sys-color-on-surface-variant);">person</md-icon>
          </div>
        `;
        menuAdmin.style.display = 'none';
        
        // 添加点击跳转到登录页面的事件
        document.getElementById('avatar-trigger').addEventListener('click', () => {
          window.location.href = 'auth.html';
        });
      }
    }

    // 菜单选项事件监听器
    menuAdmin.addEventListener('click', () => {
      window.location.href = 'admin.html';
      accountMenu.open = false;
    });

    menuProfile.addEventListener('click', () => {
      window.location.href = 'profile.html';
      accountMenu.open = false;
    });

    menuLogout.addEventListener('click', () => {
      window.DB.logout();
      accountMenu.open = false;
      window.location.href = 'auth.html';
    });

    // 初始化头像和菜单
    updateAvatarMenu();
  }
});
