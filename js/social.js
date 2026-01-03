const ImageTools = {
    processImage: (file, callback) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 128; 
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                const side = Math.min(img.width, img.height);
                ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

document.addEventListener('DOMContentLoaded', () => {
  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const state = {
    filterTags: [],
  };
  
  const urlParams = new URLSearchParams(window.location.search);
  const profileUserId = urlParams.get('id');
  const currentUser = window.DB.ctx();
  
  if (!profileUserId && !currentUser) {
    window.location.href = 'auth.html';
    return;
  }
  
  const displayUserId = profileUserId || currentUser.id;
  const isOwnProfile = currentUser && String(displayUserId) === String(currentUser.id);

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
  const panelGallery = document.getElementById('panel-gallery');
  const postsContainer = document.getElementById('posts-container');
  const followingContainer = document.getElementById('following-container');
  const followersContainer = document.getElementById('followers-container');

  async function initProfile() {
    loadProfileData();
    loadProfilePosts();
    setupFollowButton();
    setupTabs();
    setupProfileMoreButton();
    initProfileTagFilter();
    initUserSearch();
    
    if (isOwnProfile) {
      followBtn.style.display = 'none';
      messageBtn.style.display = 'none';
    } else {
      const fabBtn = document.querySelector('.fab');
      if (fabBtn) {
        fabBtn.style.display = 'none';
      }
    }
  }
  
  function initUserSearch() {
    const userSearchInput = document.getElementById('user-search-input');
    const userSearchBtn = document.getElementById('user-search-btn');
    const searchResultCount = document.getElementById('search-result-count');
    
    function searchUsers() {
      const searchQuery = userSearchInput.value.trim().toLowerCase();
      const activeTab = document.querySelector('#profile-tabs md-primary-tab[active]');
      const tabType = activeTab.getAttribute('data-tab');
      
      if (tabType === 'following') {
        loadFollowingList(searchQuery);
      } else if (tabType === 'followers') {
        loadFollowersList(searchQuery);
      }
      
      const visibleUsers = document.querySelectorAll(`${tabType === 'following' ? '#following-container' : '#followers-container'} .user-item`);
      const count = visibleUsers.length;
      searchResultCount.textContent = count > 0 ? `${count} result${count !== 1 ? 's' : ''}` : 'No results';
    }
    
    if (userSearchBtn) {
      userSearchBtn.addEventListener('click', searchUsers);
    }
    
    if (userSearchInput) {
      userSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          searchUsers();
        }
      });
    }
  }
  
  function initProfileTagFilter() {
    const tagInput = document.getElementById('tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsList = document.getElementById('tags-list');
    const clearTagsBtn = document.getElementById('clear-tags-btn');

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

    function removeTag(index) {
      state.filterTags.splice(index, 1);
      renderTags();
      loadProfilePosts();
    }

    function clearAllTags() {
      state.filterTags = [];
      renderTags();
      loadProfilePosts();
    }

    if (addTagBtn) {
      addTagBtn.addEventListener('click', () => {
        const tag = tagInput.value.trim();
        addTag(tag);
      });
    }

    if (tagInput) {
      tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const tag = tagInput.value.trim();
          addTag(tag);
        }
      });
    }

    if (clearTagsBtn) {
      clearTagsBtn.addEventListener('click', clearAllTags);
    }

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

    renderTags();
  }

  function loadProfileData() {
    const user = window.DB.getUserById(displayUserId);
    if (!user) return;

    profileAvatar.src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname || user.id}`;
    profileName.textContent = user.nickname || user.id;
    profileBio.textContent = user.bio || 'No bio available.';
    
    const tagsContainer = document.getElementById('profile-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = (user.tags || []).map(tag => 
            `<span style="background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem;">#${tag}</span>`
        ).join('');
    }

    const lastActiveEl = document.getElementById('last-active');
    if (lastActiveEl) {
        lastActiveEl.textContent = `Last active: ${window.Utils.timeAgo(user.lastActive || new Date())}`;
    }

    const viewCountEl = document.getElementById('view-count');
    if (viewCountEl) {
        viewCountEl.textContent = user.views || 0;
    }
    
    if (!isOwnProfile && currentUser) {
        window.DB.updateUser(displayUserId, { views: (user.views || 0) + 1 });
    }

    postsCount.textContent = user.stats?.posts || 0;
    followingCount.textContent = user.stats?.following || 0;
    followersCount.textContent = user.stats?.followers || 0;
  }

  function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    const posts = window.DB.getUserPosts(displayUserId);
    if (!grid) return;
    grid.innerHTML = '';
    
    let imageCount = 0;
    posts.forEach(post => {
        (post.images || []).forEach(url => {
            imageCount++;
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = "width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px; cursor:pointer;";
            img.onclick = () => PostEditor.openDetail(post.id);
            grid.appendChild(img);
        });
    });
    
    if (imageCount === 0) grid.innerHTML = '<p class="empty-state">No photos found.</p>';
  }

  function setupFollowButton() {
    if (isOwnProfile) return;
    updateFollowButton();
    followBtn.addEventListener('click', toggleFollow);
  }

  function updateFollowButton() {
    const isFollowing = window.DB.isFollowing(displayUserId);
    followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
    followBtn.style.backgroundColor = isFollowing ? 'var(--md-sys-color-surface-container)' : '';
    followBtn.style.color = isFollowing ? 'var(--md-sys-color-on-surface)' : '';
  }

  function toggleFollow() {
    window.DB.toggleFollow(displayUserId);
    updateFollowButton();
    loadProfileData(); 
  }

  function setupTabs() {
    const tabs = profileTabs.querySelectorAll('md-primary-tab');
    
    if (!isOwnProfile) {
      const tabFollowing = document.querySelector('md-primary-tab[data-tab="following"]');
      const tabFollowers = document.querySelector('md-primary-tab[data-tab="followers"]');
      if (tabFollowing) tabFollowing.style.display = 'none';
      if (tabFollowers) tabFollowers.style.display = 'none';
    }
    
    function switchSideMenu(tabType) {
      const tagsFilterCard = document.getElementById('tags-filter-card');
      const userSearchCard = document.getElementById('user-search-card');
      
      if (tabType === 'posts' || tabType === 'gallery') {
        tagsFilterCard.style.display = 'flex';
        userSearchCard.style.display = 'none';
      } else if (tabType === 'following' || tabType === 'followers') {
        tagsFilterCard.style.display = 'none';
        userSearchCard.style.display = 'flex';
      }
    }
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.removeAttribute('active'));
        tab.setAttribute('active', '');

        const tabType = tab.getAttribute('data-tab');
        panelPosts.hidden = tabType !== 'posts';
        panelFollowing.hidden = tabType !== 'following';
        panelFollowers.hidden = tabType !== 'followers';
        if (panelGallery) panelGallery.hidden = tabType !== 'gallery';

        switchSideMenu(tabType);

        if (tabType === 'following') {
          loadFollowingList();
        } else if (tabType === 'followers') {
          loadFollowersList();
        } else if (tabType === 'gallery') {
          loadGallery();
        }
      });
    });
  }

  function setupProfileMoreButton() {
    const moreBtn = document.getElementById('more-btn');
    const moreMenu = document.getElementById('profile-more-menu');
    const editBtn = document.querySelector('.profile-edit-btn');
    const settingsBtn = document.querySelector('.profile-settings-btn');

    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = moreMenu.style.display === 'none' ? 'block' : 'none';
      });

      document.addEventListener('click', () => {
        if(moreMenu) moreMenu.style.display = 'none';
      });

      moreMenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      if (editBtn) {
        if (isOwnProfile) {
          editBtn.addEventListener('click', () => {
            moreMenu.style.display = 'none';
            openEditProfileDialog();
          });
        } else {
          editBtn.style.display = 'none';
        }
      }

      if (settingsBtn) {
        if (isOwnProfile) {
            settingsBtn.addEventListener('click', () => {
                moreMenu.style.display = 'none';
                openAccountSettingsDialog();
            });
        } else {
            settingsBtn.style.display = 'none';
        }
      }
    }
  }

  function openAccountSettingsDialog() {
      const dialog = document.getElementById('account-settings-dialog');
      if (!dialog) return;

      const colorOptions = document.querySelectorAll('.color-option');
      const resetBtn = document.getElementById('reset-theme-btn');
      
      colorOptions.forEach(option => {
          option.onclick = () => {
              const color = option.dataset.color;
              if (window.ThemeEngine) {
                  window.ThemeEngine.setThemeColor(color);
                  colorOptions.forEach(opt => {
                      opt.style.border = '2px solid transparent';
                      opt.innerHTML = '';
                  });
                  option.style.border = '2px solid var(--md-sys-color-primary)';
                  option.innerHTML = '<md-icon style="color: white; font-size: 24px;">check</md-icon>';
                  option.style.display = 'flex';
                  option.style.alignItems = 'center';
                  option.style.justifyContent = 'center';
              }
          };
      });

      if (resetBtn) {
          resetBtn.onclick = () => {
              if (window.ThemeEngine) {
                  window.ThemeEngine.resetThemeColor();
                   colorOptions.forEach(opt => {
                      opt.style.border = '2px solid transparent';
                      opt.innerHTML = '';
                  });
              }
          };
      }
      
      const currentColor = localStorage.getItem('m3_theme_color');
      if (currentColor) {
          const activeOption = Array.from(colorOptions).find(opt => opt.dataset.color.toLowerCase() === currentColor.toLowerCase());
          if (activeOption) {
               activeOption.style.border = '2px solid var(--md-sys-color-primary)';
               activeOption.innerHTML = '<md-icon style="color: white; font-size: 24px;">check</md-icon>';
               activeOption.style.display = 'flex';
               activeOption.style.alignItems = 'center';
               activeOption.style.justifyContent = 'center';
          }
      }
      dialog.show();
  }

  function openEditProfileDialog() {
      const dialog = document.getElementById('edit-profile-dialog');
      const user = window.DB.getUserById(displayUserId);
      if (!user) return;

      const nicknameInput = document.getElementById('edit-profile-nickname');
      const bioInput = document.getElementById('edit-profile-bio');
      const avatarPreview = document.getElementById('edit-avatar-preview');
      const fileInput = document.getElementById('edit-file-input');
      const avatarBase64Input = document.getElementById('edit-profile-avatar-base64');
      const saveBtn = document.getElementById('edit-profile-confirm-btn');

      nicknameInput.value = user.nickname || '';
      bioInput.value = user.bio || '';
      avatarPreview.src = user.avatar || '';
      avatarBase64Input.value = user.avatar || '';

      fileInput.onchange = (e) => {
          if (e.target.files[0]) {
              ImageTools.processImage(e.target.files[0], (base64) => {
                  avatarPreview.src = base64;
                  avatarBase64Input.value = base64;
              });
          }
      };

      saveBtn.onclick = () => {
          const updatedNickname = nicknameInput.value.trim();
          const updatedBio = bioInput.value.trim();
          const updatedAvatar = avatarBase64Input.value;

          const updates = {};
          if (updatedNickname) updates.nickname = updatedNickname;
          if (updatedBio) updates.bio = updatedBio;
          if (updatedAvatar) updates.avatar = updatedAvatar;

          if (Object.keys(updates).length > 0) {
              if (window.DB.updateUser(user.id, updates)) {
                  loadProfileData();
                  dialog.close();
              }
          } else {
              dialog.close();
          }
      };
      dialog.show();
  }

  function loadProfilePosts() {
    let posts = window.DB.getUserPosts(displayUserId);
    postsContainer.innerHTML = '';

    if (state.filterTags.length > 0) {
      posts = posts.filter(post => {
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

  function createPostElement(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;

    const author = window.DB.getUserById(post.authorId);
    const isLiked = currentUser && post.likes.includes(currentUser.id);
    const likeIcon = isLiked ? 'favorite' : 'favorite_border';

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
      ? `<div class="author-avatar" data-author-id="${post.authorId}" style="cursor: pointer;"><img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.nickname || author.id)}" style="width:32px; height:32px; border-radius:12px; object-fit:cover;"></div>` 
      : `<div class="author-avatar brand-mark" data-author-id="${post.authorId}" style="cursor: pointer; width: 32px; height: 32px; font-size: 14px;">${String(author.id).substring(0,2)}</div>`;

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
        </div>
      </div>
    `;

    const likeBtn = card.querySelector('.btn-like');
    const commentBtn = card.querySelector('.btn-comment');
    const authorAvatar = card.querySelector('.author-avatar');
    const moreBtn = card.querySelector('.post-more-btn');
    const moreMenu = card.querySelector('.post-more-menu');
    const editBtn = card.querySelector('.post-edit-btn');
    const deleteBtn = card.querySelector('.post-delete-btn');

    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = Number(likeBtn.dataset.id);
        if (window.DB) {
            if (!window.DB.ctx()) { alert('Please login'); return; }
            window.DB.toggleLike(postId);
            loadProfilePosts();
        }
      });
    }

    if (authorAvatar) {
      authorAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const authorId = authorAvatar.dataset.authorId;
        window.location.href = `profile.html?id=${authorId}`;
      });
    }

    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = moreMenu.style.display === 'none' ? 'block' : 'none';
      });
    }

    document.addEventListener('click', () => {
        if(moreMenu) moreMenu.style.display = 'none';
    });

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = 'none';
        openEditPostDialog(post.id);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = 'none';
        deletePost(post.id);
      });
    }

    if (commentBtn) {
      commentBtn.addEventListener('click', () => PostEditor.openDetail(post.id));
    }

    card.addEventListener('click', (e) => {
      if (!e.target.closest('button') && !e.target.closest('md-icon-button') && !e.target.closest('md-outlined-button')) {
        PostEditor.openDetail(post.id);
      }
    });

    return card;
  }

  function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
      if (window.DB.deletePost(postId)) {
        loadProfileData();
        loadProfilePosts();
      }
    }
  }

  function openEditPostDialog(postId) {
    const dialog = document.getElementById('edit-post-dialog');
    const post = window.DB.getPostById(postId);
    const contentInput = document.getElementById('edit-post-content');
    const imageUrlInput = document.getElementById('edit-post-image-url');
    const tagsInput = document.getElementById('edit-post-tags-text');
    const saveBtn = document.getElementById('edit-confirm-btn');

    if (!post) return;

    contentInput.value = post.content;
    imageUrlInput.value = post.images && post.images.length > 0 ? post.images[0] : '';
    tagsInput.value = post.tags ? post.tags.join(' ') : '';

    dialog.show();

    saveBtn.onclick = () => {
      const updatedContent = contentInput.value.trim();
      const updatedImageUrl = imageUrlInput.value.trim();
      const updatedTags = tagsInput.value.trim().split(/\s+/).filter(tag => tag);

      if (updatedContent) {
        const updatedPost = {
          ...post,
          content: updatedContent,
          images: updatedImageUrl ? [updatedImageUrl] : [],
          tags: updatedTags
        };

        if (window.DB.updatePost(updatedPost)) {
          loadProfilePosts();
          dialog.close();
        }
      }
    };
  }

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
    
    if (!hasResults) {
      followingContainer.innerHTML = '<div class="empty-state">No matching users found.</div>';
    }
  }

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
    
    if (!hasResults) {
      followersContainer.innerHTML = '<div class="empty-state">No matching users found.</div>';
    }
  }

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

    const followBtnItem = userDiv.querySelector('.follow-btn');
    if (followBtnItem) {
      followBtnItem.addEventListener('click', () => {
        const userId = followBtnItem.dataset.userId;
        const followingNow = window.DB.toggleFollow(userId);
        followBtnItem.textContent = followingNow ? 'Unfollow' : 'Follow';
      });
    }

    const userInfo = userDiv.querySelector('.user-info');
    userInfo.addEventListener('click', () => {
      window.location.href = `profile.html?id=${user.id}`;
    });

    return userDiv;
  }

  function setupBottomNav() {
    const navButtons = document.querySelectorAll('[data-route]');
    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const route = button.dataset.route;
        navButtons.forEach(btn => btn.classList.remove('is-active'));
        button.classList.add('is-active');
        
        switch(route) {
          case 'home': window.location.href = 'index.html'; break;
          case 'explore': window.location.href = 'index.html'; break;
          case 'notification': window.location.href = 'notifications.html'; break;
          case 'profile': break;
        }
      });
    });
  }

  function setupUserAvatarMenu() {
    const avatarContainer = document.getElementById('user-avatar-container');
    const accountMenu = document.getElementById('account-menu');
    const menuAdmin = document.getElementById('menu-admin');
    const menuProfile = document.getElementById('menu-profile');
    const menuLogout = document.getElementById('menu-logout');

    function updateAvatarMenu() {
      const user = window.DB.ctx();
      if (user) {
        if (user.role === 'admin') {
          menuAdmin.style.display = 'flex';
        } else {
          menuAdmin.style.display = 'none';
        }

        avatarContainer.innerHTML = `
          <img id="avatar-trigger" src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname || user.id}`}" alt="User Profile">
        `;

        document.getElementById('avatar-trigger').addEventListener('click', () => {
          accountMenu.open = !accountMenu.open;
        });
      } else {
        avatarContainer.innerHTML = `
          <div id="avatar-trigger" class="placeholder-avatar">
            <md-icon style="width: 24px; height: 24px; color: var(--md-sys-color-on-surface-variant);">person</md-icon>
          </div>
        `;
        menuAdmin.style.display = 'none';
        document.getElementById('avatar-trigger').addEventListener('click', () => {
          window.location.href = 'auth.html';
        });
      }
    }

    menuAdmin.addEventListener('click', () => { window.location.href = 'admin.html'; accountMenu.open = false; });
    menuProfile.addEventListener('click', () => { window.location.href = 'profile.html'; accountMenu.open = false; });
    menuLogout.addEventListener('click', () => { window.DB.logout(); accountMenu.open = false; window.location.href = 'auth.html'; });

    updateAvatarMenu();
  }

  initProfile();
  setupBottomNav();
  setupUserAvatarMenu();
});