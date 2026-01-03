(() => {
  const state = {
    filter: "all",
    route: "home",
    filterTags: [],
  };

  const tabs = document.getElementById("feed-tabs");
  const tabButtons = Array.from(document.querySelectorAll("#feed-tabs md-primary-tab"));
  const navButtons = Array.from(document.querySelectorAll("[data-route]"));

  const panelMap = {
    all: {
      panel: document.getElementById("panel-all"),
      list: document.getElementById("feed-list-all"),
      empty: document.getElementById("feed-empty-all"),
    },
    following: {
      panel: document.getElementById("panel-following"),
      list: document.getElementById("feed-list-following"),
      empty: document.getElementById("feed-empty-following"),
    },
  };

  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const formatTime = (isoString) => {
    if (window.Utils && typeof window.Utils.timeAgo === "function") {
      return window.Utils.timeAgo(isoString);
    }
    const time = new Date(isoString);
    if (Number.isNaN(time.getTime())) {
      return "just now";
    }
    return time.toLocaleString();
  };

  const mockFeed = () => {
    return [
      {
        id: Date.now(),
        authorId: "20230001",
        content: "Welcome to CampusLink. Share your campus moment.",
        images: [],
        tags: ["#campus", "#daily"],
        likes: ["20230002"],
        comments: [],
        timestamp: new Date().toISOString(),
      },
    ];
  };

  const getFeedData = (filter, params = {}) => {
    if (window.DB && typeof window.DB.getFeed === "function") {
      const mapped = filter === "following" ? "following" : "all";
      const data = window.DB.getFeed(mapped, params);
      return Array.isArray(data) ? data : [];
    }
    return mockFeed();
  };

  const normalizePost = (post) => {
    return {
      id: post.id,
      authorId: post.authorId || "unknown",
      content: post.content || "",
      tags: Array.isArray(post.tags) ? post.tags : [],
      images: Array.isArray(post.images) ? post.images : [],
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments) ? post.comments : [],
      timestamp: post.timestamp || new Date().toISOString(),
    };
  };

  const getActivePanel = () => {
    return panelMap[state.filter] || panelMap.all;
  };

  const renderFeed = () => {
    const panel = getActivePanel();
    if (!panel || !panel.list) return;
    const params = state.filterTags.length > 0 ? { tags: state.filterTags } : {};
    const posts = getFeedData(state.filter, params).map(normalizePost);

    panel.list.innerHTML = "";

    if (!posts.length) {
      panel.empty.hidden = false;
      return;
    }

    panel.empty.hidden = true;

    const fragment = document.createDocumentFragment();
    posts.forEach((post, index) => {
      const card = document.createElement("article");
      card.className = "post-card";
      card.dataset.id = post.id;
      card.style.animationDelay = `${index * 0.05}s`;

      const tagsMarkup = post.tags
        .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
        .join("");

      const imagesMarkup = (post.images || []).map(img => `<img src="${img}" style="border-radius: 12px; margin-top: 8px; max-height: 300px; object-fit: cover;">`).join("");
      
      const user = window.DB ? window.DB.ctx() : null;
      const isLiked = user && post.likes.includes(user.id);
      const likeIcon = isLiked ? 'favorite' : 'favorite_border';

      const author = window.DB && window.DB.getUserById ? window.DB.getUserById(post.authorId) : null;
      const avatarHtml = (author && author.avatar) 
        ? `<div class="author-avatar" style="cursor: pointer;" data-author-id="${post.authorId}"><img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.nickname || author.id)}" style="width:32px; height:32px; border-radius:12px; object-fit:cover;"></div>` 
        : `<div class="author-avatar brand-mark" style="cursor: pointer; width: 32px; height: 32px; font-size: 14px;" data-author-id="${post.authorId}">${String(author ? author.id : post.authorId).substring(0,2)}</div>`;

      // Check if user is logged in and not the author
      const isCurrentUser = user && String(user.id) === String(post.authorId);
      const isFollowing = user && !isCurrentUser && window.DB.isFollowing ? window.DB.isFollowing(post.authorId) : false;
      
      // Generate more options menu based on rules
      let moreMenuHtml = '';
      if (user) {
        let menuItems = [];
        if (isCurrentUser) {
          // Post author is current user: Edit and Delete
          menuItems.push(`<div class="post-more-item post-edit-btn" data-post-id="${post.id}">Edit</div>`);
          menuItems.push(`<div class="post-more-item post-delete-btn" data-post-id="${post.id}">Delete</div>`);
        } else {
          // Post author is not current user: Follow/Unfollow
          menuItems.push(`<div class="post-more-item btn-follow" data-author-id="${post.authorId}">${isFollowing ? 'Unfollow' : 'Follow'}</div>`);
        }
        
        if (menuItems.length > 0) {
          moreMenuHtml = `
            <div class="post-more-container">
              <md-icon-button class="post-more-btn" aria-label="More options" data-post-id="${post.id}">
                <md-icon>more_vert</md-icon>
              </md-icon-button>
              <div class="post-more-menu" style="display: none;">
                ${menuItems.join('')}
              </div>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <div class="post-header">
          ${avatarHtml}
          <div style="flex:1; margin-left: 12px;">
            <div class="post-author md-typescale-title-small">${escapeHtml(
            author ? (author.nickname || author.id) : post.authorId
          )}</div>
            <div class="post-meta md-typescale-body-small">${escapeHtml(
            formatTime(post.timestamp)
          )} ${author ? `• ${author.stats?.followers || 0} followers` : ''}</div>
          </div>
          ${moreMenuHtml}
        </div>
        <div class="post-content md-typescale-body-medium" style="margin-top: 8px;">${escapeHtml(
          post.content
        )}
        ${imagesMarkup}
        </div>
        <div class="post-tags" style="margin-top: 8px;">${tagsMarkup}</div>
        <div class="post-actions" style="margin-top: 12px;">
          <md-outlined-button type="button" class="btn-like" data-id="${post.id}">
            <md-icon slot="icon">${likeIcon}</md-icon>
            ${post.likes.length}
          </md-outlined-button>
          <md-outlined-button type="button" class="btn-comment" data-id="${post.id}">
            <md-icon slot="icon">chat_bubble_outline</md-icon>
            ${post.comments.length}
          </md-outlined-button>
          <md-text-button type="button" style="display: none;">Share</md-text-button>
        </div>
      `;
      fragment.appendChild(card);
    });

    panel.list.appendChild(fragment);

    // Add event listeners for author avatars
    panel.list.querySelectorAll('.author-avatar').forEach(avatar => {
      avatar.addEventListener('click', () => {
        const authorId = avatar.dataset.authorId;
        window.location.href = `profile.html?id=${authorId}`;
      });
    });

    // Add event listeners for more options buttons
    panel.list.querySelectorAll('.post-more-btn').forEach(button => {
      const postId = button.dataset.postId;
      const moreMenu = button.closest('.post-more-container').querySelector('.post-more-menu');
      
      // Toggle more menu
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = moreMenu.style.display === 'none' ? 'block' : 'none';
      });
      
      // Click outside to close menu
      document.addEventListener('click', () => {
        moreMenu.style.display = 'none';
      });
      
      // Edit button event
      const editBtn = moreMenu.querySelector('.post-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moreMenu.style.display = 'none';
          // Call edit function if available
          if (window.openEditPostDialog) {
            openEditPostDialog(postId);
          }
        });
      }
      
      // Delete button event
      const deleteBtn = moreMenu.querySelector('.post-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moreMenu.style.display = 'none';
          // Call delete function if available
          if (window.deletePost) {
            window.deletePost(postId);
          }
        });
      }
      
      // Follow button event
      const followBtn = moreMenu.querySelector('.btn-follow');
      if (followBtn) {
        followBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moreMenu.style.display = 'none';
          const authorId = followBtn.dataset.authorId;
          if (window.DB && window.DB.toggleFollow) {
            const isFollowing = window.DB.toggleFollow(authorId);
            followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
          }
        });
      }
    });
  };

  const setActiveFilter = (filter) => {
    state.filter = filter;
    const index = filter === "following" ? 1 : 0;

    if (tabs && "activeTabIndex" in tabs) {
      tabs.activeTabIndex = index;
    }

    tabButtons.forEach((tab, tabIndex) => {
      tab.toggleAttribute("active", tabIndex === index);
    });

    Object.entries(panelMap).forEach(([key, panel]) => {
      if (panel.panel) {
        panel.panel.hidden = key !== filter;
      }
    });

    renderFeed();
  };

  const setActiveRoute = (route) => {
    state.route = route;
    navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.route === route);
    });
  };

  if (tabs) {
    tabs.addEventListener("change", () => {
      const index = typeof tabs.activeTabIndex === "number" ? tabs.activeTabIndex : 0;
      const nextFilter = tabButtons[index]?.dataset.filter || "all";
      setActiveFilter(nextFilter);
    });
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      setActiveRoute(route);

      if (route === "profile") {
        const currentUser = window.DB?.getCurrentUser();
        if (currentUser) {
          window.location.href = "profile.html";
        } else {
          window.location.href = "auth.html";
        }
      } else if (route === "notification") {
        window.location.href = "notifications.html";
      } else if (route === "explore") {
        window.location.href = "explore.html";
      }
    });
  });

  if (window.DB && typeof window.DB.on === "function") {
    window.DB.on("db:update", () => renderFeed());
  }

  // Auto-detect route from URL
  const path = window.location.pathname;
  if (path.includes('notifications.html')) {
    state.route = 'notification';
  } else if (path.includes('profile.html')) {
    state.route = 'profile';
  } else {
    state.route = 'home';
  }

  setActiveFilter(state.filter);
  setActiveRoute(state.route);

  // 打开编辑帖子对话框
  function openEditPostDialog(postId) {
    if (typeof postId === "string") postId = parseInt(postId, 10);
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
          renderFeed(); // 重新加载帖子列表
          dialog.close();
        }
      }
    };
  }

  // 删除帖子
  function deletePost(postId) {
    if (typeof postId === "string") postId = parseInt(postId, 10);
    if (confirm('Are you sure you want to delete this post?')) {
      if (window.DB.deletePost(postId)) {
        renderFeed(); // 重新加载帖子列表
      }
    }
  }

  // 导出函数到全局，方便其他地方调用
  // 标签筛选功能
  function initTagFilter() {
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
        renderFeed();
        tagInput.value = '';
      }
    }

    // 删除标签
    function removeTag(index) {
      state.filterTags.splice(index, 1);
      renderTags();
      renderFeed();
    }

    // 清空所有标签
    function clearAllTags() {
      state.filterTags = [];
      renderTags();
      renderFeed();
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

  window.openEditPostDialog = openEditPostDialog;
  window.deletePost = deletePost;

  if (window.customElements && customElements.whenDefined) {
    customElements.whenDefined("md-tabs").then(() => {
      setActiveFilter(state.filter);
    });
  }

  // 初始化标签筛选功能
  initTagFilter();
})();
